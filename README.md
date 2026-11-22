# Tools

A Next.js tools directory. The first tool is **Framecraft**, a browser based editor for composing product screenshots with backgrounds and exporting images for social posts.

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
  components/                  Shared platform UI and shadcn/ui components
  features/framecraft/          Framecraft domain and editor logic
    components/                Canvas, background, screenshot and shared controls
    framecraft-editor.tsx       Editor state and orchestration
    model.ts                    Versioned composition and asset types
    presets.ts                  Canvas sizes and background presets
    render.ts                   Shared Canvas 2D preview and export renderer
    storage.ts                  Typed browser persistence boundary and IndexedDB adapter
  lib/
    tools.ts                    Typed directory registry for available tools
docs/
  milestone-1.md                Product scope and phased implementation plan
```

Keep new tools under their own feature folders. Put reusable platform components in `src/components` and shared tool directory metadata in `src/lib/tools.ts`. Keep route modules thin and avoid sharing tool-specific code across features.

## Framecraft

Framecraft uses a single typed composition model for output size, background, screenshot frame, crop and appearance. The editor supports landscape, square, portrait and custom canvases; solid, gradient and image backgrounds; image adjustments and overlays; screenshot positioning, resizing, crop, border and shadow controls; undo/redo; original and finished previews; local templates; local project files; recovery drafts; PNG and JPEG export.

The desktop editor uses a workspace beside its controls. On phones, the preview uses the available width and the controls move to an expandable bottom panel. The canvas can be manipulated with pointer or touch. Numeric fields and arrow keys provide alternatives for precise positioning and crop adjustments.

### Images, projects and templates

- Uploads accept PNG, JPEG and WebP files up to **40 MB each**. Images are limited to **16,000 pixels on either side** and **32 million pixels total**.
- Output canvases are limited to **4,096 pixels on either side** and **16 million pixels total**.
- Images, templates and recovery drafts are stored in browser IndexedDB. They are not uploaded by this application. Browser data may be cleared or evicted; recovery is best effort.
- If IndexedDB is unavailable, images can remain in memory for the current session, up to **80 MB**. Download a project file to preserve work beyond the session.
- A `.framecraft` project file contains the composition and source images. It is downloaded locally and can be reopened later. Imports are limited to **80 MB**.
- A template saves the canvas, background and screenshot styling without the main screenshot. Templates are stored in the current browser and can be removed when browser data is cleared.
- PNG preserves requested transparent corners. JPEG uses a white matte and offers a quality setting.

## Implementation notes

- **Rendering:** Framecraft uses the browser Canvas 2D API instead of adding Konva or Fabric. The same renderer draws the editable preview and final output, so composition scaling, clipping, effects and layer order have one source of truth. Workspace guides and selection handles are excluded from export. Shadow spread is approximated with a stroked outline because Canvas 2D does not expose a native shadow-spread setting.
- **Persistence:** The editor depends on the `FramecraftStorage` interface in `storage.ts`; the first implementation uses IndexedDB. Composition data and stable asset IDs do not depend on browser APIs, which leaves a boundary for a future remote storage adapter.
- **UI:** shadcn/ui components provide common controls. Shared light and dark theme tokens live in `src/app/globals.css`; button, card, control and popover styles use those tokens. `next-themes` respects the system preference and saves an explicit theme choice.
- **Limits:** Canvas filters, memory use and export capacity vary by browser and device. Large images and output sizes can fail on constrained devices; the editor reports input, storage and export errors while preserving the current in-memory composition.

## Scope

This release has no accounts, server-side image processing, external uploads, cloud saving, analytics, billing or direct posting to X. Browser persistence and downloaded project files are separate: the browser copy is convenient and recoverable, while the downloaded project is the user's portable backup.
