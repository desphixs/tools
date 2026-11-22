# Milestone 3: Device Mockups

## Purpose

Add a focused tool for placing a product screenshot into a device or device-in-scene mockup. A user chooses a prepared mockup, adds a screenshot, adjusts how it sits inside the device screen, previews the result, and downloads the composition.

This is a separate tool from Framecraft. Framecraft remains the freeform screenshot-on-background editor. The two tools may share proven UI components, image handling, local storage boundaries, project-file patterns, and export utilities, but their editor models and rendering behavior remain feature-owned.

This file is the implementation brief and handoff plan for Milestone 3. The plan reflects the agreed approach: begin with a platform-curated static mockup catalog, keep mockup images in the repository, and define screen geometry per mockup. Implementation began after the user asked to proceed; this plan remains the source of truth for scope and follow-up review.

## Product decisions

- Tool name: **Device Mockups**.
- Route: `/tools/device-mockups`.
- Register the tool in the existing tool directory and typed tool registry.
- Keep Device Mockups separate from Framecraft. Add a cross-link between the tools later only if it improves the workflow.
- The platform provides the initial mockup catalog. Users supply their product screenshot, not a prepared PNG mockup.
- Store catalog images as static files under the repository's root `public/mockups/` directory. Store their typed descriptions and screen geometry in the feature catalog under `src/features/device-mockups/`.
- No database or object storage is required for the initial catalog. Files in `public` are served by URL and must be present at build time; changing the catalog or its assets requires deploying the updated app.
- Select mockup source images that are original, commissioned, or licensed for inclusion in the public product and for use in generated user exports. Do not bundle mockup assets copied from unrelated sites without suitable rights.
- User images stay in the browser. The app must not upload screenshots or finished compositions to a server.
- Build a 2D still-image workflow first. Each scene has a fixed point of view; rotating devices in 3D, video mockups, and user-authored mockup creation are not in this milestone.
- The template defines the screen angle and shape. Users adjust image fit, crop, zoom, and position inside that screen; they do not need to set perspective corners for every screenshot.
- Preserve the source screenshot aspect ratio. Fit it to the mockup screen with an explicit crop/fit behavior; never stretch it to match.
- Keep project and editor data behind typed boundaries so a later catalog service or cloud storage can be added without coupling the editor to a specific storage implementation.

## Existing project context

- The project is a Next.js App Router application with TypeScript, React, Tailwind, shadcn/ui components, light/dark themes, and a typed tool registry in `src/lib/tools.ts`.
- Tool-specific routes should stay thin. Domain models, catalog data, rendering, persistence, editor orchestration, and controls belong under `src/features/device-mockups/`.
- Framecraft and Collage Maker already process user images locally and have feature-owned Canvas 2D renderers. Reuse shared infrastructure where it is genuinely shared, but do not couple mockup-specific screen geometry or project state into either tool.
- Framecraft's Canvas 2D transform supports affine transforms such as scale, rotation, translation, and skew. An angled display like the supplied laptop and monitor references needs a projective quadrilateral warp. A CSS-only preview transform is insufficient because export must render the same perspective.
- Read the installed Next.js documentation in `node_modules/next/dist/docs/` and inspect the current repository state before implementation. Installed versions and existing code are authoritative.
- Preserve all unrelated user changes. Do not clean, stage, or modify unrelated work.

## Development rules

- Follow `AGENTS.md` and this document. Keep implementation in meaningful, coherent commits as work progresses, with clear messages and unrelated user changes excluded.
- Record material decisions, completed scope, and limitations in this file while working so it remains a reliable handoff.
- Use the current project UI tokens, shadcn/ui components, and shared theme conventions. Keep the UI clean, readable, minimal, responsive, and accessible. Use concise plain-language copy.
- Keep advanced or uncommon controls grouped. Provide keyboard and non-dragging alternatives for positioning and crop adjustments.
- Follow the active user instructions for checks and tests. Do not run tests, lint, type checks, or builds unless requested.

## User journey

1. The user opens **Device Mockups** from the tools directory.
2. They browse or filter the available device scenes, then choose a mockup.
3. They upload, paste, or drop a screenshot. The editor places it into the template's screen area automatically.
4. They adjust fit, crop, zoom, or position within the screen, and can replace the screenshot without losing the selected mockup.
5. They preview the scene without editing guides and export a PNG or JPEG.
6. They may save and reopen a local project file containing their screenshot and settings. The bundled mockup itself is resolved from its catalog ID and version; it is not copied into the project file.

## Scope

### Mockup catalog

- Start with a curated selection of laptop and desktop-monitor scenes matching the supplied visual direction. Keep the metadata model open to phone and tablet screens without requiring those categories for the first usable release.
- Provide a thumbnail, descriptive name, category, source dimensions, scene asset, display aspect ratio, screen geometry, and any optional screen mask or foreground layer for each catalog item.
- The scene can be a full photo with a neutral/blank device display. It does not need to have a transparent background.
- A transparent foreground layer may contain the device bezel, glass reflections, or objects that overlap the screen. Include it only when the scene needs it.
- Use a screen polygon or alpha mask to constrain the screenshot to the display area. Use both when needed to preserve rounded corners or irregular edges accurately.
- Keep thumbnail assets reasonably small and load full scene assets when a template is selected. Use efficient web formats for photographic assets, and keep transparency for layers that need it.
- Track source and permission information in catalog metadata or an adjacent internal asset note. Ensure both app delivery and user exports are covered by the asset rights.

Suggested repository organization (adapt to existing conventions without creating catch-all files):

```text
public/
  mockups/
    laptop-desk-01/
      preview.webp
      scene.webp
      screen-mask.png       # optional
      foreground.png        # optional
    monitor-room-01/
      preview.webp
      scene.webp
      screen-mask.png       # optional
      foreground.png        # optional

src/features/device-mockups/
  model.ts
  catalog.ts
  render.ts
  storage.ts              # only if required; use a typed boundary
  device-mockups-editor.tsx
  components/
```

### Catalog metadata and screen geometry

- Define a validated, versioned `MockupTemplate` model. Keep the catalog as typed data in `src/features/device-mockups/catalog.ts`; do not fetch a database for the first release.
- Store each screen corner in normalized scene coordinates from `0` to `1`, ordered top-left, top-right, bottom-right, bottom-left. This keeps coordinates independent of preview size and output resolution.
- Store the target display aspect ratio and recommended input size. Define a stable template ID and template version so local projects can resolve their catalog entry later.
- A template entry may include a screen alpha mask and a foreground/reflection layer. Paths must resolve only to known bundled assets; imported project files must not provide arbitrary URLs for catalog resources.
- Validate screen points at catalog load: all coordinates must be finite and in range, the polygon must have usable area, and point ordering must not self-intersect. Return a useful failure state if a catalog asset is missing or invalid.

Illustrative shape (values are examples, not final geometry):

```ts
type NormalizedPoint = { x: number; y: number };

type MockupTemplate = {
  id: string;
  version: number;
  name: string;
  category: "laptop" | "monitor" | "phone" | "tablet";
  previewSrc: string;
  sceneSrc: string;
  screenCorners: [NormalizedPoint, NormalizedPoint, NormalizedPoint, NormalizedPoint];
  screenAspectRatio: number;
  screenMaskSrc?: string;
  foregroundSrc?: string;
  recommendedInputSize?: { width: number; height: number };
};
```

### Screen placement and composition

- The template author defines the display's four corners once for each scene. Do not run AI or surface recognition on every user upload.
- Prepare the user screenshot in the display's rectangular coordinate space first. Default to a proportional fill/crop behavior that uses the screen area without distortion, and allow the user to zoom and move the screenshot inside the screen. Provide a fit option when useful; explain that it may leave unused space inside the display.
- Store crop, zoom, and position as typed, serializable composition data separate from the source image and template files. Keep template perspective fixed for this milestone.
- Map the rectangular screen image onto the template's destination quadrilateral with a projective transform. Clip the result to the display mask or polygon.
- Render layers in a documented order: scene/base image, warped screenshot, then optional foreground/reflection layer. Preserve a neutral screen base beneath the warped screenshot where transparent or unfilled pixels could otherwise reveal old content.
- Support template-specific lighting/reflection overlays only where prepared assets exist. Do not attempt to infer realistic lighting from arbitrary user photos in this milestone.
- Changing the output preview size or output dimensions must not distort the scene or screenshot. Keep the template image and screen mapping proportional; define any crop or padding behavior explicitly.
- Make preview and export use the same scene model, crop calculations, projective mapping, mask, and layer order. Do not let a CSS or DOM-only transformation create a preview that cannot be reproduced in the export.

### Screenshot input and editing

- Accept supported local PNG, JPEG, or WebP screenshots; allow file selection, drag/drop, and paste where the existing tools support them.
- Validate format, dimensions, and file size before decoding. Reuse established image limits where appropriate, and confirm mockup-specific memory needs during Phase 0.
- Preserve the original uploaded image. Store only references and editing settings in the composition model; keep binary data in the existing browser asset/storage boundary or in memory if persistent storage is unavailable.
- Provide a clear empty state before a screenshot is added and useful errors for unsupported, corrupt, missing, or oversized images.
- Provide clear controls for replace/remove, fit mode, zoom, and position/crop within the screen. Add numeric or button alternatives for precise positioning; dragging must not be the only interaction.
- Make Undo/Redo available for meaningful composition changes and group continuous gestures into sensible history entries if consistent with the existing shared editor conventions.

### Editor and export

- Build a responsive editor with a catalog selection view, a visible mockup preview, and a contextual settings panel. Desktop may use a side panel; mobile should keep the preview visible with controls accessible in a deliberate panel or sheet.
- Keep image export separate from project saving. Provide PNG and JPEG export at the selected output resolution, with JPEG quality control if supported by the shared export UI.
- Use a clean preview mode without handles or guides. Selection guides and controls must not be included in output.
- Make output dimensions clear. Prefer a template's native scene dimensions or a small set of suitable sizes; preserve aspect ratio and avoid silent upscaling or distortion.
- Reuse the shared local project pattern where practical. A versioned project should include the template ID/version, screenshot asset data, and composition settings. It should not duplicate bundled mockup assets or require a database.
- If a project references a template that is not present or has an unsupported version, report the issue clearly and preserve the user's current editor state.
- Keep any local recovery and project features behind a typed persistence boundary. Browser storage is best-effort; a downloadable project file remains the portable user-controlled copy.

## Technical direction

### Projective rendering proof

Canvas 2D's standard `transform(a, b, c, d, e, f)` is an affine 2D transform; it cannot by itself map all four corners of a rectangle into a general perspective quadrilateral. The renderer needs a projective warp for angled laptop and monitor screens.

In Phase 0, compare a browser-compatible homography implementation with a small WebGL/shader fallback. **Homography.js** is an initial candidate because it accepts source/destination reference points and can warp images to persistent image data. Treat it as a candidate, not a final dependency, until the proof confirms API compatibility, license, image quality, alpha handling, memory use, preview speed, and export resolution. Do not select an old or unmaintained package from name recognition alone.

Keep perspective mapping behind a narrow feature-owned interface, for example `warpScreenToQuad(...)`, so the editor and catalog are not tied to one library. Reuse the existing Canvas 2D compositor for scene layers only if the chosen warp output can be composed and exported reliably. If CPU image warping is too slow or memory-heavy, evaluate a WebGL implementation behind the same rendering contract. Do not introduce a general 3D engine unless the project scope changes to editable 3D scenes.

### Preview, export, and memory

- Render a lower-resolution working preview and a full-resolution export only when requested. Keep the screen geometry normalized and convert it to the active render size.
- Avoid retaining multiple full-resolution `ImageData` copies. Reuse decoded image resources and invalidate derived screen warps when the screenshot, crop, or template changes.
- Bound image dimensions and total pixels. Confirm limits using representative mockup images and screenshots in the target browsers.
- Ensure all bundled assets are same-origin and exportable without a tainted canvas. Revoke object URLs and release image/canvas resources on replacement, clear, project open, and unmount.
- Handle rendering failures without clearing the selected template or original screenshot; allow users to retry.

### Static catalog and future storage boundary

- Serve initial catalog files from root `public/mockups/`. Next.js serves files in `public` from URL paths; only files present at build time are available.
- Keep catalog access behind a feature-owned function/interface (for example, `listMockupTemplates()` and `getMockupTemplate(id)`) even though the first implementation reads a static TypeScript catalog.
- Keep domain logic independent of public URLs. The catalog can later be backed by a database plus object storage or a CDN without changing editor controls and composition logic.
- No upload/admin management interface is included now. Static catalog changes require a code change and deployment.

## Out of scope

- Database, object storage, cloud sync, accounts, collaboration, billing, or analytics.
- User-uploaded mockup catalog assets or an admin/catalog-management dashboard.
- AI surface detection, automatic screen recognition, background removal, or one-click conversion of arbitrary photos into mockups.
- Full 3D device models, user-controlled camera orbit, device rotation, lighting environments, animation, or video export.
- Apparel, packaging, book, poster, or other non-device mockups. Keep the catalog model extensible, but focus this milestone on digital displays.
- Multi-screen layouts, multiple devices per composition, batch mockup creation, direct X posting, or a general-purpose image editor.
- Bundling mockups from third-party websites without rights to distribute the assets in the product and use them in generated exports.

## Implementation phases

### Phase 0 — Asset and rendering feasibility

**Goal:** Confirm the mockup asset format and a production-usable perspective path before building the editor around assumptions.

- Review the current repo, existing user changes, Framecraft renderer, storage contracts, UI components, package manager, and installed Next.js documentation.
- Confirm the intended initial library categories and identify suitable blank-screen or layered source scenes. Document each asset's source and permissions before adding it.
- Prepare one laptop scene and one monitor scene as proofs. Record the screen corners, intended aspect ratio, any mask, and any foreground/reflection layer.
- Implement or prototype the upload → screen fit/crop → projective warp → mask → layer composite path outside the product UI.
- Compare the Homography.js candidate with a WebGL/shader fallback if it fails a requirement. Confirm license and maintenance before adding a dependency.
- Compare preview and full-resolution output for perspective accuracy, screen-edge bleed, alpha, color, and sharpness. Measure memory and render time using representative source images.
- Set supported image/output limits from observed browser behavior. Document any limitations or changed technical direction in this plan.

**Checkpoint:** One local screenshot can be placed into both proof mockups with convincing screen alignment, no stretching, clean edges, and matching preview/export behavior using a browser-compatible renderer.

### Phase 1 — Tool route, directory entry, and editor shell

**Goal:** Make Device Mockups discoverable and establish the responsive, themed workspace.

- Add the tool's name, description, icon, and route to `src/lib/tools.ts` and the home directory.
- Add a thin `/tools/device-mockups` route and loading state that follows current Next.js conventions.
- Create the feature-owned editor shell with a mockup library view, preview area, and controls panel.
- Add focused empty, loading, and error states. Do not create dead actions or placeholder UI that looks functional.
- Use shared shadcn/ui components, tokens, theme classes, and responsive patterns. Support both light and dark themes.

**Checkpoint:** A user can reach the new tool from the directory, browse a clear empty/catalog state, and use the shell at desktop and phone widths.

### Phase 2 — Catalog model and bundled mockup assets

**Goal:** Make platform-provided mockups addressable and verifiable without a database.

- Define versioned TypeScript models for catalog entries, normalized screen geometry, optional masks/overlays, composition state, and project metadata.
- Add static assets under `public/mockups/` and typed catalog entries under `src/features/device-mockups/`.
- Build catalog cards with thumbnails, names, categories, and concise labels. Add category filters or search if the initial catalog size warrants them.
- Validate IDs, asset paths, dimensions, screen point ordering, aspect ratio, and optional layer references.
- Load the selected full-resolution template without loading every scene at once. Keep public file URLs limited to known catalog data.
- Record source/permission information and optimize assets without degrading screen edges or scene quality.

**Checkpoint:** The tool lists and previews all included templates, and every entry resolves its assets and geometry from the static catalog.

### Phase 3 — Screenshot upload and screen placement

**Goal:** Let users replace the blank display content with their screenshot and adjust its crop predictably.

- Implement PNG, JPEG, and WebP upload, paste, and drag/drop using existing local image handling patterns.
- Auto-fit the screenshot to the template display aspect ratio with a no-stretch default. Provide fit/fill behavior and editable zoom/reposition controls inside the screen.
- Map the cropped screen image to the template's four normalized screen corners. Clip to the screen polygon or mask, including rounded screen corners.
- Render optional foreground/reflection layers above the screenshot. Keep the scene and user image editable and non-destructive.
- Provide reset, replace, remove, undo/redo where appropriate, numeric or button-based positioning alternatives, keyboard support, and touch-friendly controls.
- Handle portrait/landscape mismatches with an explicit crop/fit result instead of stretching or silently discarding important image areas.

**Checkpoint:** Users can add and adjust a screenshot in each supported template; content remains inside the screen with consistent perspective and no distortion.

### Phase 4 — Composition output, projects, and local recovery

**Goal:** Produce reliable downloads and let users preserve their work locally.

- Finalize one rendering contract for preview and export: scene, screenshot fit/crop, perspective mapping, screen mask, and optional foreground/reflection layers.
- Add clean preview mode and PNG/JPEG export at the chosen dimensions. Keep selection outlines, controls, and guides out of the export.
- Reuse the typed local project boundary where practical. Include template ID/version, screenshot bytes, and composition settings; validate project schema and size before opening.
- Keep template assets in the application catalog rather than duplicating them in project files. Explain when a referenced template is missing or incompatible.
- Add local recovery only through the existing storage abstraction. State clearly that browser storage may be cleared and keep project-file download as the portable copy.
- Preserve the current composition on import/render/storage errors. Clean up temporary resources safely.

**Checkpoint:** Users can export a full-quality mockup and save/reopen a local project without a database or remote image upload.

### Phase 5 — Integrated review and handoff

**Goal:** Review the finished workflow and record its real support boundaries.

- Review the complete browse → choose mockup → add screenshot → adjust → preview → export journey at desktop, tablet, and phone widths.
- Review light/dark themes, keyboard and touch operation, visible focus, non-drag alternatives, status feedback, and error states.
- Compare downloaded images with the editor preview for screen placement, crop, perspective, masks, overlays, colors, transparency, and output dimensions.
- Check multiple screenshot aspect ratios, screen shapes, file formats, image limits, replace/remove flows, project reopen, unavailable storage, and missing catalog assets.
- Confirm the tools directory, route, browser-local image handling, static asset paths, and project compatibility behavior.
- Update the README and this document with actual behavior, included catalog categories, asset sources/permissions, renderer choice, limits, and known issues.
- Record completion and remaining limitations, then present the finished interface for user review.

**Checkpoint:** The tool is discoverable, responsive, accessible, and reliable for its stated catalog and image limits; preview and exported output agree, and all known limitations are documented.

## Definition of done

- Device Mockups appears as a separate tool in the directory and uses its own route and feature domain.
- The initial platform-curated mockup catalog is served from bundled static assets and loaded through a typed catalog boundary without a database.
- Every supported template has documented screen geometry and optional mask/layer data; a user does not have to manually position the screenshot in the device frame.
- User screenshots are processed locally, keep their aspect ratio, and can be fitted, cropped, zoomed, and repositioned within the screen.
- Perspective, clipping, foreground layers, and export use the same composition semantics in preview and final output.
- PNG/JPEG export works at supported sizes, and local project save/open behaves as documented.
- The editor follows the existing theme, UI-token, accessibility, responsive, and copy requirements.
- Asset permissions, actual rendering method, storage behavior, tested limits, and known tradeoffs are recorded in this document and the README.

## Material risks and decisions to resolve in Phase 0

- **Asset availability and rights:** High-quality blank-screen or layered mockup files are required. The supplied example images are references, not necessarily reusable template sources. Asset rights must cover app distribution and user-generated exports.
- **Screen geometry quality:** Corner points must match the visible display exactly. A small error creates visible bleed or bezel gaps, especially on angled screens.
- **Reflections and occlusion:** A single flattened image may not preserve realistic glass reflections or objects in front of the display when its screen is replaced. Prefer layered source assets for these scenes.
- **Perspective renderer:** Existing Canvas 2D transforms alone do not implement a general four-corner projective warp. The selected implementation must meet image quality, alpha, performance, memory, and export requirements.
- **Template availability:** Catalog images are part of the application deployment. Adding or replacing them requires deploying an updated app until a remote catalog/storage provider is introduced.
- **Aspect-ratio mismatch:** Screenshots often differ from the physical display ratio. The editor must explain and expose crop/fit behavior rather than stretch the source.

## Research references

- [Next.js: `public` folder](https://nextjs.org/docs/app/api-reference/file-conventions/public-folder) — static files in the root `public` folder are served from URL paths and must be present at build time.
- [Canva: Create mock-ups using images or designs](https://www.canva.com/en_au/help/mockup-design/) — choose a mockup, add an image, adjust crop/position, and optionally create a template from a photo with surface detection and review.
- [Rotato Web: Introduction](https://app.rotato.app/help) and [Importing an image](https://rotato.app/help/import-image) — examples of the distinct, more advanced 3D device workflow and image-to-screen placement.
- [MDN: CanvasRenderingContext2D `transform()`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/transform) — Canvas 2D's affine transform controls.
- [Homography.js](https://github.com/Eric-Canas/Homography.js/) — candidate browser library for affine, projective, and piecewise-affine image warping; evaluate before adoption.
- [Placeit: Upload an image to a mockup](https://help.placeit.net/hc/en-us/articles/37882846146713-How-to-upload-an-image-to-a-mockup) — mockup-specific input limits and recommended image sizes.

## Implementation record (2026-11-23)

### Implemented in the first release

- Added the **Device Mockups** directory entry, `/tools/device-mockups` route, responsive loading state, and feature-owned editor under `src/features/device-mockups/`.
- Added two original blank-screen scenes: one laptop and one monitor. The scenes and small catalog previews are optimized WebP files under `public/mockups/`. The asset source and each screen's normalized corner coordinates are recorded in `public/mockups/README.md`.
- Added a typed catalog boundary with stable IDs and versions. Catalog items may use the bundled paths or trusted HTTPS asset URLs, which leaves room for a future hosted catalog. Imported project files carry a catalog ID/version, not a URL.
- Added per-template quadrilateral geometry, screen aspect ratio, and normalized corner radius. The screenshot is fitted or cropped proportionally inside a screen-space image, then warped to the four scene corners. Rounded display corners use an alpha mask in screen space. Preview and export call the same renderer.
- Used a small feature-owned Canvas 2D inverse-homography renderer with bilinear sampling; no additional rendering package was added. It calculates the mapping from normalized screen corners at the active render size, so preview scaling does not change placement. Scene output is 1536 × 1024 at 1× or 3072 × 2048 at 2×.
- Added mockup selection and dynamic category filtering; screenshot selection, paste, and drag/drop; fill/fit, zoom and X/Y position; dragging within the screen and arrow-key positioning; grouped undo/redo; Edit and Finished views; PNG/JPEG export; and a project-file popover with download/open actions.
- Added local auto-recovery in a feature-owned IndexedDB adapter and portable versioned `.devicemockup` files. The portable file includes the user's screenshot and composition, but resolves the bundled scene by template ID/version.
- Added source and dimension limits: PNG/JPEG/WebP screenshots up to 40 MB, 16,000 pixels per side, and 32 megapixels; project files up to 80 MB. JPEG exports use 92% quality.
- Kept catalog, editor, and local draft storage behind separate typed interfaces. Future cloud catalog hosting can replace the static catalog provider. Account-backed project saves will need an authenticated project repository and object storage, but can keep the current composition schema, template references, perspective renderer, and editor controls.

### Current limits and review notes

- The initial library contains only one laptop and one monitor scene. Phone and tablet categories are represented in the model and will appear in filters when matching catalog entries are added.
- The bundled scenes are flattened photographs with blank screens. There is no independent reflection or foreground layer, so this first version does not synthesize realistic glass reflections or content that should overlap a display.
- Perspective warping is a CPU Canvas 2D pixel loop. It avoids a new dependency and produces consistent preview/export geometry, but render speed and memory have not been profiled on mobile devices. Keep image limits conservative until reviewed on target devices.
- Catalog scenes are delivered as part of the application deployment. Updating the public catalog still requires a code deployment. A future hosted catalog can return current asset URLs by stable ID/version; remote scene hosts must allow anonymous CORS reads so browser canvas export can safely sample the images. The current implementation has no database, authentication, cloud sync, or user-managed catalog.
- Browser recovery can be cleared or evicted. A downloaded project file is the portable copy. Users need to download a project before switching devices or browsers.
- No automated tests, lint, typecheck, or build were run during this implementation, in keeping with the active review constraints. Review the interface and exported output before treating the milestone as fully accepted.
