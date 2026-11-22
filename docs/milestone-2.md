# Milestone 2: Local GIF Maker

## Purpose

Add a focused GIF creation tool to the existing tools directory. A user can make a looping GIF from a short local video clip or a sequence of still images, adjust a small set of output settings, preview the result, and download it.

This file is the implementation brief and handoff plan for Milestone 2. Use it as the source of truth for the feature. Complete the defined scope end to end. Do not expand into a general video editor or GIF hosting service. Record material implementation decisions and any change to scope here as work proceeds.

## Product decisions

- Tool name: **GIF Maker**.
- Route: `/tools/gif-maker`.
- Add it to the existing tool directory and tool registry.
- Process user media on their device. The app must not upload source media or generated GIFs.
- Accept one video **or** a sequence of still images per composition. The user chooses the input mode; the two modes are not mixed in one GIF in this milestone.
- Generate and download a standard animated `.gif` file.
- Keep editing state in memory for the current visit. No project file, account, cloud save, automatic recovery, or server processing is in scope.
- Use the existing visual system, shared components, themes, and responsive conventions.

## Existing project context

The repo is a Next.js App Router application with TypeScript, React, Tailwind, shadcn/ui components, and a typed tool registry in `src/lib/tools.ts`. Existing tools are organized by feature under `src/features`. Framecraft and Collage Maker use Canvas 2D for preview and export, keep domain models separate from rendering and browser storage, and process user images locally. Follow those conventions without coupling GIF-specific logic into either feature.

Before implementation, inspect the current repository state and installed Next.js documentation in `node_modules/next/dist/docs/`, as required by the project workflow. The code and package versions currently installed are authoritative. Preserve unrelated user changes.

## User journey

1. The user opens **GIF Maker** from the tools directory.
2. They choose **Video** or **Images**.
3. They add a local source file or files and see a preview.
4. They adjust the timing and output settings that apply to their chosen input mode.
5. They select **Create GIF** and receive clear progress and a way to cancel.
6. They preview the generated animation and download it, or change settings and generate again.
7. They can clear the current source and start over without refreshing the page.

## In-scope behavior

### Video input

- Accept one local video file. The first release targets browser-decodable MP4 and WebM files; actual codec support depends on the user's browser.
- Read duration and dimensions locally and show a useful error if the browser cannot load or seek the file.
- Provide a video preview and start/end controls for selecting the clip. Use numeric time fields as precise, keyboard-accessible alternatives to timeline handles.
- Require a valid, non-empty range. Do not silently export a default clip if the chosen range is invalid.
- Provide a frame-rate setting. Start with a default of 12 fps and a practical range of 5–15 fps; validate the final range and defaults during the technical spike.
- Sample frames only within the selected range. Export must not include audio.

### Image-sequence input

- Accept multiple PNG, JPEG, or WebP images, consistent with the existing image tools.
- Show an ordered list or thumbnail strip with each image's position visible.
- Let users reorder frames using pointer controls and accessible **Move up** / **Move down** buttons. Dragging must not be the only way to reorder.
- Provide one global frame-duration control, defaulting to 100 ms, with an editable numeric value. Per-image timing and transition effects are out of scope.
- Require at least two images to create an animation. Explain the requirement before export.

### Shared output settings

- Provide a small set of common aspect-ratio choices: **Original**, **Square**, **Portrait**, and **Landscape**. Original preserves the source ratio. Other choices use a clear fit/crop behavior that is consistent in preview and output.
- Provide a simple output-size control based on maximum width or a small set of size presets. Preserve aspect ratio and do not upscale beyond source resolution by default.
- Provide loop behavior: **Forever** (default) or **Once**.
- Show output settings in a clearly labeled section. Avoid exposing low-level encoder settings in the first release.
- Keep the final generated GIF preview separate from the editable source preview. Show the generated file's size when available.
- Use a predictable filename such as `gif-maker.gif`, with a safe option to use the uploaded video's base name.

### Resource limits

Media decoding and GIF encoding can use substantial memory and CPU. Phase 0 must confirm realistic limits using the actual implementation in the target browsers. Begin with these proposed guardrails and adjust only when measured evidence supports it:

- Video clip: up to 10 seconds.
- Video frame rate: 5–15 fps, default 12 fps.
- Output maximum dimension: 640 px, with a smaller default size suitable for a quick export.
- Image sequence: 2–30 frames.
- Frame duration: 50–2,000 ms, default 100 ms.

Enforce limits before encoding. Explain how to resolve limit errors, and never silently truncate a clip, drop frames, change the requested dimensions, or return a partial GIF. If browser/device measurements show that the proposed limits are unsafe, set lower limits and document the evidence.

## Interface and interaction requirements

- Keep the page simple: source-mode choice, source preview, mode-specific timing controls, shared output settings, and one prominent create/download action.
- Use the existing semantic design tokens and shared UI components. Support light and dark themes.
- On desktop, keep the preview and controls in a clear workspace-and-controls layout. On phones, prioritize a visible preview and keep the essential create, cancel, and download actions reachable without excessive scrolling.
- Make input mode, selected clip range, frame order, output dimensions, and current processing state clear.
- Provide visible focus, labels for all inputs, appropriate accessible names for icon buttons, and status announcements for progress and errors.
- Timeline and reorder interactions require keyboard and non-dragging pointer alternatives. Number fields must be available for precise timing and size values.
- While encoding, disable conflicting edits, show progress when the encoder can report it, and provide a cancel action. If progress cannot be measured precisely, show an honest indeterminate state instead of invented percentages.
- On cancellation or failure, clean up temporary resources and preserve the source and settings so the user can retry.
- Keep copy concise and actionable. Do not expose implementation terms such as Web Worker or encoder in the product UI.

## Technical direction

### Suggested feature structure

Keep the route thin and group GIF-specific code under `src/features/gif-maker/`. Suggested boundaries (adapt filenames to fit the actual design):

- `model.ts`: typed input-mode and settings models, defaults, and validation.
- `render.ts`: source-frame drawing and aspect-ratio/crop calculations shared by preview and export.
- `encode.ts` or `encoder/`: typed boundary around the selected encoder and worker lifecycle.
- `gif-maker-editor.tsx`: client-side editor orchestration and user interaction.
- `components/`: mode-specific source, timing, and output controls when separation improves clarity.
- `page.tsx` and a loading state under `src/app/tools/gif-maker/`.

Keep source blobs/object URLs and browser APIs behind editor or infrastructure boundaries. Store stable source metadata in the domain model rather than object URLs. Revoke object URLs and release video/canvas/worker resources on replacement, clear, cancellation, route unmount, and successful completion where safe.

### Frame extraction and encoding

The preferred first approach is browser-native media decoding: load the local video in an `HTMLVideoElement`, seek to the selected sample times, wait for the media element to be ready after each seek, and draw each decoded frame to a canvas. Draw still images to the same frame renderer. Use one renderer for the visible output preview and the frame pixels passed to the encoder so crop, sizing, and compositing match.

Use `gifenc` as the initial encoding candidate. It accepts indexed image data and provides palette quantization and GIF frame writing, but does not ship a ready-made worker API. Implement a typed worker boundary so CPU-heavy quantization and encoding do not block the main UI. Keep the number and dimensions of in-flight frames bounded; do not retain every full-resolution decoded frame in memory unnecessarily.

Phase 0 must validate that the selected package, worker bundling, and worker asset paths work with this repo's current Next.js setup. Confirm package version, license, and maintenance state before installation. Do not install `@ffmpeg/ffmpeg` or `gifski-wasm` preemptively.

If native decoding fails the supported input requirements or cannot reliably produce frames in the supported browsers, stop and document the evidence. Then evaluate `@ffmpeg/ffmpeg` as an explicit alternative, including its WebAssembly payload, worker and static asset deployment, memory/performance impact, and licenses of the selected core build. Do not quietly switch to a server upload or remote conversion service.

### GIF output constraints

- GIF supports up to 256 palette colors per frame; photographic footage may show banding or dithering.
- GIF has no audio and does not support partial alpha the way PNG does. Define and document how transparent source pixels are handled; use a consistent matte or validated binary transparency behavior rather than silently producing inconsistent edges.
- Keep generated output valid, animated, correctly timed, and readable by the browser. Verify loop-once and loop-forever behavior.
- Never claim that a high frame rate, large size, or photographic source will remain small or visually lossless.

### Persistence and privacy

- No server endpoints, external media URLs, analytics payloads, or upload dependencies are needed for this tool.
- Do not persist imported media or drafts in IndexedDB in this milestone. Source files remain in memory for the current editing session; clearly state that clearing or leaving the page discards the current work if that is relevant to navigation behavior.
- Do not retain generated GIF object URLs after they are replaced or the editor unmounts.
- Keep domain settings independent of browser implementation so future persistence could be added without rewriting the model.

## Out of scope

- URL import, YouTube or social media download, server-side processing, uploads, accounts, hosted galleries, or direct sharing.
- Editing or optimizing an existing animated GIF.
- Combining multiple videos, audio, a multi-track timeline, speed curves, transitions, or keyframe animation.
- Captions, stickers, watermarks, filters, drawing, or arbitrary overlay layers.
- Per-image timing, crossfades, stop-motion automation, or batch export.
- Project files, local templates, cloud saves, and draft recovery.
- Supporting every video codec or container regardless of browser support.
- Animated WebP, APNG, MP4, or other output formats.

## Implementation plan

Use the phases as decision and review checkpoints. Make meaningful commits as each coherent slice is completed, following `AGENTS.md`. Do not include unrelated working-tree changes in commits.

### Phase 0 — Inspect and prove the media pipeline

**Goal:** Resolve the main technical risk before building the editor.

- Inspect the live repository, current `package.json`, lockfile, shared tool patterns, and relevant installed Next.js docs.
- Check existing working-tree changes and preserve them.
- Confirm `gifenc` current version, API, license, and worker compatibility. Do not assume this brief's package recommendation overrides evidence from the installed setup.
- Create a minimal local proof of concept outside the product UI: load an MP4 and WebM that the target browsers can decode, seek and capture a few frames, encode with `gifenc` in a worker, and open the resulting animated GIF.
- Check worker packaging in Next.js and confirm cancellation/cleanup can be implemented without leaking object URLs or leaving workers active.
- Measure rough processing time and memory with representative short clips and image sequences. Set final upload, clip, frame, and output bounds based on these observations.
- If this path is blocked, document the specific failure and assess FFmpeg WASM against its payload, browser isolation/deployment, memory, and licensing costs before selecting a replacement.

**Checkpoint:** A browser-local source can be decoded into frames and encoded into a valid animated GIF using a production-compatible worker path, or an evidence-based alternative is documented and selected in the implementation notes.

### Phase 1 — Register route and editor shell

**Goal:** Make the tool discoverable and establish a responsive, themed editor.

- Add GIF Maker metadata and icon to `src/lib/tools.ts` and the home directory.
- Add `/tools/gif-maker` with metadata, a thin route, and loading UI.
- Build the responsive editor shell with **Video** and **Images** input modes, clear empty states, and accessible navigation.
- Use shared components and theme tokens; do not create new global styles unless genuinely shared.

**Checkpoint:** The directory links to the new route; the shell works at phone and desktop widths in light and dark themes with no dead controls.

### Phase 2 — Domain model, validation, and local source lifecycle

**Goal:** Represent inputs and settings safely before adding export behavior.

- Define typed models for video input, ordered image frames, timing, dimensions, aspect ratio, loop mode, and editor status.
- Define defaults and validation for file type, file size, image dimensions, video metadata, clip range, frame count, output size, and duration.
- Load local sources with useful validation errors. Keep source blobs separate from serializable composition settings.
- Create and revoke object URLs correctly. Clear replaced and unused source state without invalidating the current preview.
- Enforce the Phase 0 measured limits before frame extraction or encoding.

**Checkpoint:** Valid sources load, invalid or unsupported files receive actionable errors, and replace/clear flows release temporary resources without losing unrelated settings.

### Phase 3 — Video and image-sequence controls

**Goal:** Let users choose and prepare a GIF source.

- Implement local video preview, metadata display, start/end selection, and numeric timing alternatives.
- Implement image sequence thumbnails, order controls, accessible move-up/down alternatives, and global frame duration.
- Implement shared aspect ratio, fit/crop, output-size, and loop controls.
- Keep preview transform and export transform calculations in the same renderer.
- Make selected mode and applicable controls clear; retain or reset mode-specific settings predictably when switching modes.

**Checkpoint:** A user can prepare a valid video clip or image sequence, understand all selected settings, and see a preview consistent with the expected export.

### Phase 4 — Worker encoding, preview, download, and recovery from errors

**Goal:** Produce the GIF and let the user finish the workflow.

- Implement a typed worker message protocol for initialization, frame input, progress, completion, error, and cancellation.
- Extract video frames at the selected rate and within the validated clip range. Render ordered image frames with the chosen duration.
- Bound memory and work. Ensure cancellation terminates or resets work safely and does not block editing afterward.
- Create an animated preview from the result and a download action with a safe filename and `image/gif` MIME type.
- Report processing errors clearly; keep source and settings intact for retry. Show output size when known.
- Clean up worker, canvas, bitmap, and object URL resources on retry, replacement, cancellation, clear, completion, and unmount.

**Checkpoint:** Both input modes generate an animated GIF that opens and plays with the requested order, timing, crop, size, and loop behavior; failures and cancellation preserve the editable source.

### Phase 5 — Integrated verification and handoff

**Goal:** Review the complete experience and document actual support and limits.

- Run the repo's lint, typecheck, and production build scripts.
- Manually exercise the full journey for video and image inputs, including replace, clear, invalid input, invalid timing, maximum supported input, processing, cancellation, retry, preview, and download.
- Inspect actual downloaded GIFs for dimensions, animation, frame order, timing, loop behavior, matte/transparency, and agreement with the preview.
- Review desktop, intermediate, and phone layouts; light and dark themes; keyboard and touch controls; focus and screen-reader feedback; progress and error states.
- Check supported browser decoding with representative MP4/WebM files. Clearly document tested browser support and unsupported formats/codecs.
- Check performance on representative devices and ensure the chosen input/output limits prevent avoidable tab freezes or memory exhaustion.
- Update `README.md` with the feature, supported inputs, controls, limits, local-processing behavior, package choices, and known GIF limitations.
- Record actual completion status and remaining limitations in this document. Present the finished interface for user review.

**Checkpoint:** The tool is discoverable, usable, and complete for the defined scope; supported formats and processing limits are based on observed behavior, and known limitations are visible to users.

## Definition of done

- A user can create and download an animated GIF from one supported local video or a sequence of supported local images.
- The source preview, timing controls, frame order, crop/aspect behavior, output dimensions, and loop setting behave as documented.
- Output is valid and opens in a browser; visual preview, output dimensions, timing, and looping match the selected settings within GIF format constraints.
- Processing is local. No source or output media is uploaded by the app.
- Resource limits are enforced before expensive processing. Progress, cancellation, failure, retry, and cleanup work without losing the source/settings.
- Common interactions are responsive, accessible, keyboard-operable, and usable without dragging.
- The feature follows repo architecture and theme conventions and is registered in the tool directory.
- Lint, typecheck, and production build pass; manual verification is complete and the README and implementation notes describe actual support and limitations.

## Research references

- [MDN: Manipulating video using canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Manipulating_video_using_canvas) — drawing a decoded video frame into Canvas 2D.
- [MDN: `HTMLVideoElement.requestVideoFrameCallback()`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback) — video frame callbacks and frame timing metadata.
- [gifenc](https://github.com/mattdesl/gifenc) — browser and Node GIF encoding API; frame palettes and worker example.
- [ffmpeg.wasm overview](https://ffmpegwasm.netlify.app/docs/overview/) — browser worker and WebAssembly architecture if broader decoding is required.
- [MDN: GIF format](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Image_types#gif_graphics_interchange_format) — browser support and color-format constraints.
