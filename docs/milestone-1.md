# Milestone 1: Tools home and Framecraft screenshot composer

## Development rules

- Commit implementation in meaningful, coherent slices as work progresses rather than waiting until the entire milestone is complete. Use clear commit messages, verify each slice appropriately, and keep unrelated user changes out of commits. Phase checkpoints can guide commit boundaries, but a phase may contain multiple sensible commits.
- Follow `AGENTS.md` and this document throughout implementation. Track completed work and material decisions so progress remains clear across sessions.

## Implementation decisions and current status

- The in-scope editor, local project and template flows, recovery, and image export are implemented. `pnpm lint`, `pnpm typecheck`, and `pnpm build` pass. A browser review covered the home page and editor at wide, intermediate, and phone widths (929, 768, 390, and 320 CSS pixels), both themes, screenshot placement, and the export settings dialog; a 320-pixel horizontal overflow found during review was corrected. The checkboxes below still identify deeper feature, persistence, export-fidelity, failure-path, and automated-test verification that remains outstanding.
- Follow-up interaction fixes now select screenshot, background, or canvas controls directly from the composition; lock screenshot frames to the source image ratio; and use a filled, blurred shadow shape with editable width and height that track the screenshot while they remain unchanged. No tests, lint, type checks, or build were run for this follow-up, as requested.
- Changing a canvas preset or custom dimensions updates only the output bounds. Screenshot position, frame size, crop, rotation, border, shadow, and other styling remain unchanged in output-space coordinates; any part outside the new canvas bounds is clipped until repositioned.
- Framecraft uses the browser Canvas 2D API as its single renderer for both preview and export. This avoids a second rendering path and keeps the first release free of a canvas-engine dependency. Crop positioning is handled in the composition model and does not modify source images.
- Shared controls, canvas, background, and screenshot panels live in feature components. Composition types, presets, rendering, and browser persistence have separate files under `src/features/framecraft`.
- Browser images, templates, and recovery drafts use IndexedDB behind the `FramecraftStorage` boundary. If persistent image storage is blocked, uploads and project imports can remain in session memory up to 80 MB; the user is told to download a project file for a portable copy.
- Upload limits are 40 MB per image, 16,000 pixels per side, and 32 million pixels total. Output is limited to 4,096 pixels per side and 16 million pixels total. Project imports are limited to 80 MB.
- The screenshot shadow is a filled rounded shape rendered behind the screenshot, with blur, opacity, color and offsets. Shadow width and height default to the screenshot frame and remain synchronized when that frame changes until the user customizes a dimension. Spread expands the filled shape because Canvas 2D has no native shadow-spread property. Rendering and storage remain browser-local; no backend or external upload is introduced in this milestone.

## Purpose and context

Build the first release of a public-facing platform that will eventually contain multiple useful tools. The first tool, **Framecraft**, turns a product screenshot and a background into a polished image for sharing on X and elsewhere. A user chooses an output size, edits the background and screenshot independently on a live canvas, and downloads the result. The name is a working product name and can be changed later.

This document is the implementation brief and acceptance criteria for milestone 1. Complete the entire in-scope feature set below, not just a visual mockup or a basic upload and export demo. The future ideas section records ideas explicitly deferred in the original discussion. If an implementation decision is unclear, choose the simplest usable, accessible solution consistent with this brief and document material tradeoffs.

## Existing project and implementation constraints

- The repository is a fresh Next.js App Router application using `src/app`, TypeScript with strict checking, React, and Tailwind CSS. The installed versions and scripts in `package.json` are the source of truth.
- Use **shadcn/ui and its components** as the shared UI foundation. Set it up for the existing Next.js, TypeScript, and Tailwind configuration, and use its components for suitable interface elements such as buttons, cards, dialogs, tabs, inputs, sliders, and menus. Adapt the components to a cohesive product design and preserve their accessibility. The interactive canvas and specialized editor controls may be custom-built where needed; avoid duplicating suitable shared components.
- Follow `AGENTS.md`: read the relevant installed Next.js documentation in `node_modules/next/dist/docs/` before writing code. Respect the existing configuration and avoid unnecessary changes.
- Keep public pages and the tool route in the same application. Use server rendering for the shell where useful; interactive editor and browser APIs belong behind a client component boundary. Load editor-only dependencies on the tool route, and defer heavy pieces where useful.
- Build a responsive, polished, cohesive interface with clear hierarchy, accessible controls, and useful empty, loading, error, and success states. The editor must remain usable on narrow screens and touch devices, with no essential controls inaccessible.
- Do not add accounts, a database, a server-side image pipeline, billing, or external uploads for this milestone. Images and projects remain on the user's device unless the user explicitly saves or downloads them. No direct posting to X is required.

## Design and copy direction

- Prioritize a clean, modern, intuitive interface. Use simple layouts, clear visual hierarchy, comfortable spacing, readable typography, and restrained color and decoration. Keep the workspace focused and avoid clutter, unnecessary visual effects, and generic AI-generated styling.
- Make the next action and the purpose of each control clear without adding unnecessary explanation. Group related controls logically and reveal detail when it is useful, while keeping essential actions easy to find.
- Write concise, plain, human-readable labels, descriptions, and messages. Remove text that does not help the user understand or complete a task. Avoid marketing language, filler, jargon, and generic AI-sounding copy. Errors should explain what happened and, when possible, how to resolve it.
- Apply these principles consistently across the home page, editor, dialogs, empty states, and feedback. Minimalism must not come at the expense of accessibility, discoverability, or clear feedback.
- The implementing agent owns the visual and layout decisions: build and refine the complete interface using good judgment, then present the finished work for review. Do not require an early design approval or ask the user to supervise routine visual decisions.

### Centralized design tokens

- Define the core visual design in a central, documented set of semantic tokens, using CSS variables and the project's Tailwind and shadcn/ui theming conventions. Include colors and themes, border colors and widths, corner radii, shadows, and other shared visual properties. Avoid scattering hard-coded visual values across components.
- Use shared component styles or component-level tokens for recurring elements such as buttons, cards, inputs, and dialogs. For example, changing the shared button-radius definition in one place should update button corners throughout the application; changing a card or border token should update its intended uses consistently. Build on shadcn/ui's existing theme and component conventions rather than introducing a competing styling system.
- Give tokens meaningful roles (such as surface, border, and button radius), so their values can change without rewriting every use. Keep intentional exceptions explicit and limited. Ordinary local layout utilities such as `mt-1` or `pt-3` can remain in components when they do not define a shared visual style.
- Support both light and dark themes throughout the platform and editor. Define theme-specific values for shared semantic tokens centrally, and use those tokens through Tailwind and shadcn/ui styles wherever possible. Use theme-specific Tailwind classes when needed, without scattering hard-coded theme colors across components. Provide an accessible theme switcher, respect the system preference by default, and retain an explicit user choice across visits.
- Check every component and state in both themes, including borders, shadows, focus indicators, dialogs, menus, disabled controls, and the editor workspace. Maintain readable contrast and a clear distinction between the workspace and the composition; switching the application theme must not change the user's exported image.
- Keep the product interface's design tokens separate from user-controlled composition settings: a screenshot's chosen border, radius, color, or shadow is project data and must remain independently editable.

## User journey

1. Visit `/` and see a concise introduction and a list of available tools. Framecraft is the first card, with a name, description, and clear action. Clicking the card or its action navigates to `/tools/framecraft`.
2. Open the editor with a usable default composition and a clear prompt to add a screenshot. Choose a canvas preset or custom dimensions.
3. Choose a background preset, color, gradient, or uploaded image. Upload, drop, or paste the main screenshot. Adjust the two layers independently and see changes immediately.
4. Reposition, resize, crop, and style the composition. Use undo/redo or reset where needed, and preview without editor controls.
5. Export a PNG or JPEG at the chosen output dimensions. Optionally save a local project and reopen it later with its images and settings intact.
6. Save a composition as a reusable local template. Later, select it, add a new screenshot, and export another composition with the saved styling.

## Home page and platform foundation

- Replace the starter page with a real tool directory. Show Framecraft in a responsive card grid that supports adding more cards without restructuring the page.
- Keep tool metadata such as name, description, route, and icon or visual in a small typed registry. Only show tools that exist; no nonfunctional placeholder cards.
- Provide a consistent site identity, navigation back to the home page, descriptive page titles and metadata, keyboard-visible focus, and appropriate semantic links and headings.
- Keep reusable platform UI separate from Framecraft-specific features. Avoid prematurely building a plugin system or distributed architecture.

## Framecraft editor

### Responsive editor layout

- On desktop, place the workspace alongside a settings panel. On phones, prioritize a full-width preview and provide controls in an accessible bottom panel that can be expanded and collapsed. Adapt at intermediate widths, keeping essential actions and the preview accessible without obscuring the work.
- Show the most useful controls first. Organize advanced settings, such as shadow offsets and color adjustments, in clearly labeled expandable sections without hiding essential actions or compromising keyboard and touch access.

### Canvas and layout

- Offer landscape, square, and portrait presets plus custom pixel dimensions. Display the current output dimensions and validate custom values with useful errors and practical limits informed by browser canvas constraints. Presets should be suitable starting points for social posts without claiming they are mandatory platform specifications.
- Render a live composition in a workspace that fits the available viewport. Workspace zoom and pan, if pan is implemented, affect editing only; output dimensions and composition coordinates must not change. Provide an obvious fit-to-screen option.
- Allow adjustable space around the main image through its size and placement, with a convenient spacing or padding control if appropriate. Provide center and edge alignment and snapping guides that can be enabled or disabled.
- Allow canvas corner radius independently of the image frame radius. Rounded canvas corners can expose a transparent outer area in PNG. Explain and implement JPEG's opaque background behavior.
- Provide reset for relevant control groups, each layer, and the entire composition. Clearly indicate destructive resets and make them undoable or confirm them.

### Background

- Choose a solid color, gradient, bundled preset, or uploaded image. Support replacing and removing an image without unexpectedly losing unrelated settings.
- For an image, offer cover and contain, zoom, position/drag, and a non-destructive crop workflow. Keep crop, image position, and output canvas rounding distinct.
- Provide adjustable blur, opacity, brightness, contrast, saturation, and grayscale. Provide a solid-color or gradient overlay with color and opacity controls. Offer optional vignette and subtle texture controls with adjustable intensity.
- Define a predictable render order: base color/gradient, background image and its adjustments, optional texture/vignette, overlay, then main screenshot. Show disabled or context-sensitive controls where an option does not apply.

### Main screenshot

- Support upload, drag and drop, and clipboard paste; provide replace and remove actions. Validate supported image types and give readable feedback for invalid or failed files.
- Drag to position and resize using visible handles and a precise control. Lock the frame aspect ratio by default, with an explicit unlock option. Add alignment controls, rotation, and opacity.
- Provide a non-destructive crop experience with zoom and image positioning within the crop, and fit/fill choices. Frame size on the canvas and image zoom within the frame must be separate controls.
- Add independent corner radius and optional border with width, color, and opacity.
- Add shadow presets (subtle, soft, dramatic, and none) plus editable color, opacity, blur, horizontal and vertical offsets, and spread. Presets set editable values; changing a value afterwards must work. If the rendering library lacks native spread, implement it consistently in preview and export rather than silently dropping the setting.
- Show a warning when the source image's effective resolution is insufficient for its displayed size at export. Recalculate it as crop, size, or output dimensions change; do not block export.

### Editing, preview, and local projects

- Implement undo and redo for composition changes, including transformations, crop, uploads/replacements/removal, and resets. Group a continuous drag or slider gesture into a sensible history step rather than one entry per movement. New edits after undo discard the redo branch. Set a reasonable history limit and manage image memory.
- Provide accessible keyboard shortcuts for undo/redo and useful editor actions. Do not intercept typing in input fields or common browser/assistive shortcuts. Expose shortcuts in the interface.
- Provide a before-and-after view that makes the unstyled source screenshot and the finished composition easy to compare, plus a clean preview that hides selection handles and guides. Explain the comparison if the background or screenshot is missing.
- Save a versioned local project file containing the settings and original image data needed to restore the composition without relying on temporary object URLs. Reopen it locally, validate its schema and version, handle corrupt or unsupported files without losing the current work, and warn before replacing unsaved work. Include a clear project file extension and format description in implementation documentation.
- Track unsaved changes and warn before in-app navigation would discard them. Register a browser leave/reload warning only while unsaved work exists; browser behavior and wording may vary. Save a recoverable local draft automatically and offer to restore or discard it after an interruption, without silently overwriting current work. Handle unavailable storage and quota errors visibly while preserving the current session.
- Explain that browser recovery is best-effort and may be cleared or evicted. The downloadable project file is the durable user-controlled backup. Test recovery after reload and a fresh browser session, as well as the unavailable-storage path.
- Preserve original uploaded images and store edits as state, so crops and styles remain reversible. Release object URLs and other resources when they are no longer needed.

### Reusable local templates

- Let users name and save the current composition as a template, list and select saved templates, rename or replace an existing template, and delete one with confirmation. Applying a template is undoable and must not silently discard the user's current screenshot: retain it if present, or prompt the user to add one if absent.
- Save canvas and background settings and assets, plus screenshot frame layout, crop behavior and styling. Do not include the original main screenshot in a template. Define how image-specific crop and positioning adapt to a replacement screenshot of a different aspect ratio, with a predictable usable result that remains editable.
- Store templates and any required uploaded background image data in browser storage on the device. Browser file paths and temporary object URLs cannot be assumed to remain accessible: persist the image data itself (for example, in IndexedDB), and use stable asset references. Use localStorage only where appropriate for small metadata. Templates must remain usable after reload and browser restart without the original file path.
- Template saves and updates must be atomic from the user's perspective: on quota, missing-asset, or storage errors, report the problem and retain existing templates and the current composition. Warn that clearing browser data can remove locally stored templates. Keep downloadable project files separate from template storage.

### Export

- Export PNG and JPEG at the selected output dimensions, independent of workspace zoom and device pixel ratio. Include a JPEG quality control and a defined opaque matte color for transparent areas. PNG preserves transparency where requested.
- Export must match the composition preview, including crops, filters, overlays, rounded corners, borders, and shadows, but exclude selection handles, guides, and editor UI.
- Offer a sensible filename, communicate progress for expensive exports, and report failures or unsupported sizes clearly. Never silently export an incomplete or lower-resolution image.

## Interaction and accessibility

- Provide labeled controls with values, sensible ranges, units, and reset affordances. Color controls need a usable keyboard-accessible way to enter a value; do not rely on color alone to communicate state.
- Support pointer, mouse, and touch interactions. Provide keyboard-accessible alternatives for moving, resizing, cropping, and adjusting the image, with visible focus and understandable selection state.
- Also provide single-pointer, non-dragging alternatives such as numeric fields or buttons for positioning, resizing, and cropping. Keyboard access alone does not replace this requirement.
- Use semantic controls, accessible names and error messages, sufficient contrast, and logical focus order. Dialogs must manage focus and be dismissible with the keyboard. Respect reduced-motion preferences.
- Give useful feedback during image decoding and processing. Preserve the current composition when an upload, project import, or export fails. Avoid layout shifts that make controls hard to use.

## Architecture and technical approach

- Organize by feature: a typed tool registry and shared UI at the platform level; editor state, rendering, controls, import/export, and project serialization within the Framecraft feature. Keep route files thin. A possible structure is `src/features/framecraft/{components,state,rendering,lib}` and `src/lib/tools.ts`; adapt to the codebase rather than creating empty abstractions.
- Maintain a clean, coherent folder and file structure as more tools are added. Keep each tool's domain logic, components, and assets together; put genuinely shared UI and utilities in shared locations. Use clear names and responsibilities, avoid unrelated catch-all files and cross-tool coupling, and extract shared code when it has a real shared use. Document the structure as it evolves.
- Use a single typed, serializable composition model with canvas settings, background settings, screenshot/frame settings, and references to original assets. Use output-space coordinates so editing viewport size does not affect saved projects or export. Separate transient UI state (selection, dialogs, workspace zoom) from composition state and undo history.
- Make one rendering specification authoritative for preview and export, including compositing order and scaling. Keep asset loading, rendering, project serialization, and UI concerns separate enough to test and extend. Do not store raw image blobs repeatedly in undo snapshots.
- Evaluate `konva` and `react-konva` as the primary interactive canvas approach; evaluate `react-easy-crop` for cropping and `react-colorful` for color selection. These are recommendations, not requirements: verify compatibility with the installed React/Next.js versions, browser-only rendering, accessibility, filters, shadow spread, export fidelity, and maintenance before installing. Use one canvas engine; a different choice is acceptable if documented and it meets all acceptance criteria. Add only dependencies that provide real value.
- **Decision for this implementation:** use native Canvas 2D for both the interactive composition preview and output rendering. Custom crop controls keep the screenshot crop reversible in composition state. shadcn/ui supplies the shared interface controls; native accessible color and numeric inputs cover editor-specific values. Do not add Konva, Fabric, react-easy-crop, or react-colorful unless later browser measurements show a concrete need.
- Handle large files and canvas limits deliberately: validate inputs and dimensions, avoid unnecessary full-resolution processing on every slider movement, and show clear errors when a device cannot complete an operation. Use workers or staged rendering only if measurement shows they are needed. Consider browser differences in filter and canvas support.
- Local files are untrusted input: validate and safely parse project files, avoid executing embedded content, and constrain dimensions and resource use. Accurately describe what is automatically stored locally and what requires a manual download.
- Keep composition and template models independent of browser storage APIs. Define a small typed storage boundary for projects, templates, and assets, with a browser implementation now, stable asset identifiers, and versioned data. Keep rendering and editor logic independent of storage so future database and cloud implementations can be added without a total rewrite; avoid speculative cloud infrastructure or promises of a migration with no changes.
- Do not introduce a backend solely for future possibilities. Keep clean boundaries so authentication, remote project storage, or server processing can be added later without rewriting the editor's core model.

## Phased implementation plan

### How to use this plan

The requirements above define the product; the phases below turn them into an implementation sequence. Work through dependencies in order, revisit earlier phases when integration reveals a gap, and check an item only after it is implemented and verified. Record significant decisions, limitations, and completed checks in the implementation handoff or project documentation so work can resume without relying on chat history. Phase boundaries are checkpoints, not permission gates or reduced-scope releases. Make routine design and engineering decisions autonomously and present the completed milestone for review.

All checkboxes start unchecked. A phase is complete only when its checkpoint is satisfied; the milestone is complete only when every in-scope requirement and the final definition of done are met.

### Phase 0 — Inspect, validate, and make technical decisions

**Goal:** Begin from the actual repository and prove the proposed editor approach can meet the requirements.

- [x] Read `AGENTS.md`, the existing application, configuration, installed package versions, and the relevant installed Next.js guides before writing application code. Respect existing user changes. Identify the package manager in use and update the matching lockfile consistently; resolve any lockfile ambiguity from repository context without deleting a user's files.
- [x] Check current compatibility of shadcn/ui, the selected canvas engine, cropping and color controls with the installed Next.js, React, and Tailwind versions. Compare the recommended packages against actual needs; choose one rendering engine and only necessary dependencies.
- [ ] Make an early technical proof of the difficult rendering paths: client-only loading, non-destructive crop, blur and image adjustments, rounded clipping, shadow spread, and export at output resolution. Check that preview and export can use the same composition semantics. If a recommended package cannot meet these requirements, select and document a workable alternative.
- [x] Choose practical supported image formats, dimension and resource limits, default canvas preset and initial visual values based on implementation constraints. Provide an actionable response for unsupported or oversized inputs instead of assuming every device supports a fixed maximum.
- [x] Note the selected approach and material tradeoffs, including limitations that need verification later. Do not add server infrastructure, analytics, or speculative features.

**Checkpoint:** The chosen approach is compatible with the project and has a credible path to all required editing, storage, accessibility, and export behavior.

### Phase 1 — Shared foundation, themes, and tool directory

**Goal:** Establish the reusable platform UI and a working route into Framecraft.

- [x] Configure shadcn/ui for this repository and establish semantic CSS/Tailwind theme tokens for both light and dark modes. Centralize shared colors, borders, radii, shadows and component-level values; document where to change them. Keep workspace composition settings independent of UI tokens.
- [x] Create or adapt shared shadcn/ui components for the recurring controls and layouts actually needed. Ensure variants and focus, disabled, hover, and error states work in both themes. Verify that changing shared button and card style values updates their intended uses throughout the application.
- [x] Implement system-preference theme selection and an accessible light/dark switcher with a persisted explicit choice. Avoid disruptive theme flashes where practical; verify that switching themes never changes exported composition pixels.
- [x] Replace the starter page and metadata with a clean, responsive home page. Implement a typed tool registry with the Framecraft card and a real link to `/tools/framecraft`. Add consistent navigation back to the directory and appropriate route metadata.
- [x] Create the route and a feature-oriented structure for Framecraft. Keep routes thin, shared UI separate, and future tools independent; document the structure without creating empty speculative layers.

**Checkpoint:** Home, navigation, theme switching, and the Framecraft route work at desktop and mobile widths in both themes, with no starter content or dead links.

### Phase 2 — Composition model, assets, and rendering foundation

**Goal:** Establish the editor's source of truth before implementing the controls that depend on it.

- [x] Define versioned, validated TypeScript models for canvas, background, screenshot frame, crop and styling, and stable asset references. Store composition geometry in output-space coordinates; keep selection, open panels, dialogs, viewport zoom, and other transient UI state separate.
- [x] Define sensible defaults and landscape, square, and portrait presets. Implement custom pixel dimensions, validation and output-size limits. Canvas dimension changes update only output bounds; existing layer placement and styling stay unchanged in output-space coordinates, with out-of-bounds content clipped.
- [x] Define an asset lifecycle for original image data, decoding, validation, stable identifiers, object URL creation and cleanup, and error handling. Support supported-format uploads without mutating original images; use a reusable path for background and screenshot assets.
- [x] Implement the shared composition rendering contract and layer order described above. Separate rendering from selection guides and workspace chrome. Establish how scaling, clipping, opacity, filters and shadows map from composition space to preview and output space.
- [x] Build a responsive workspace shell whose CSS sizing follows available space, with resettable workspace zoom and output dimension display. Workspace zoom must not alter composition geometry. Add the empty state and a usable starting appearance before an image is added.
- [x] Define small typed persistence and asset interfaces separate from editor state and rendering. Provide browser implementations later in the plan; keep models and identifiers suitable for eventual remote persistence without implementing a cloud backend.

**Checkpoint:** A default scene can be rendered consistently from typed composition data, responds to viewport changes, and has a viable path to full-resolution export and local persistence.

### Phase 3 — Responsive editor shell and input flows

**Goal:** Make the editor understandable and usable before layering in advanced controls.

- [x] Build the desktop workspace and settings panel; build the mobile full-width preview and expandable, accessible bottom controls panel. Handle intermediate widths, scrolling, small viewports, and touch targets without hiding essential actions.
- [x] Organize canvas, background, and screenshot controls around the selected context. Show common controls first and put advanced options in labeled expandable groups. Provide clear selection, empty, loading and failure states with concise copy.
- [x] Implement screenshot upload, drop, paste, replace, and removal. Implement background image upload, replace, and removal. Handle invalid files and decode failures without losing the current composition; avoid intercepting paste intended for an input.
- [x] Provide labeled controls and non-drag alternatives alongside direct manipulation, with keyboard focus and usable numeric input. Integrate accessible dialogs, keyboard shortcuts, and reduced-motion behavior as controls are added.

**Checkpoint:** A user can reach the editor, add and replace assets, navigate its controls on desktop and phone, and recover from invalid input without losing work.

### Phase 4 — Canvas and background editing

**Goal:** Deliver the complete background and canvas workflow with immediately visible results.

- [x] Implement preset and custom output size selection, dimension feedback, canvas corner radius, transparent outer corners, and group/layer reset behavior. Keep canvas radius distinct from image crop and screenshot frame radius.
- [x] Implement solid colors, gradients, bundled background presets, and image backgrounds. Add cover/contain, image position, zoom, and a reversible crop flow with pointer, keyboard, and non-dragging alternatives.
- [x] Add blur, opacity, brightness, contrast, saturation, grayscale, solid/gradient overlay with opacity, and adjustable vignette and texture. Apply the documented render order and clearly disable or hide inapplicable options without losing values unexpectedly.
- [x] Add centering and edge alignment, optional snapping guides and spacing controls as appropriate. Ensure guides affect editing only and do not appear in clean preview or output.
- [ ] Verify every background setting independently and in combination, including reset, crop, transparency, and behavior at different output sizes. Maintain responsive interaction during slider changes.

**Checkpoint:** A user can create and revise every specified background and canvas treatment without altering the source asset or confusing workspace zoom with output size.

### Phase 5 — Screenshot placement, crop, and appearance

**Goal:** Complete independent, precise manipulation of the main image.

- [x] Implement selection, move, resize handles and precise controls, default aspect-ratio locking with an unlock option, alignment, rotation, and opacity. Ensure touch, keyboard, and single-pointer non-dragging access.
- [x] Implement reversible screenshot crop, fit/fill, zoom and repositioning within the crop. Clearly distinguish the screenshot frame's canvas size from image zoom inside it; preserve source data and define behavior when the frame or source changes.
- [x] Add independent screenshot corner radius and border width, color, and opacity. Add none, subtle, soft, and dramatic shadow presets and fully editable color, opacity, blur, X/Y offsets, width, height, and spread. Shadow dimensions default to the screenshot frame and can be customized separately. Make preview and export agree even if spread needs a custom implementation.
- [x] Calculate and show a non-blocking effective-resolution warning from the actual crop, frame size, and output scale. Update it when relevant values change.
- [ ] Test geometry at different aspect ratios, viewport sizes, rotations and output sizes, including very small or large inputs. Verify replacement and removal preserve unrelated settings.

**Checkpoint:** The screenshot can be placed, cropped, styled and replaced independently of the background, with precise accessible alternatives and predictable preview behavior.

### Phase 6 — History, preview, and safe editing

**Goal:** Make experimentation reversible and prevent accidental loss.

- [x] Implement bounded undo/redo for composition edits, asset changes, crop, transforms, resets, and template application. Group slider and drag gestures into one logical step, clear redo after a new edit, and avoid duplicating image blobs in snapshots. Define which non-composition UI actions are not history entries.
- [x] Add individual, group, layer, and whole-composition resets. Make destructive resets undoable or confirm them. Add discoverable keyboard shortcuts that do not interfere with text editing or browser/assistive shortcuts.
- [x] Add a clean preview and before/after comparison against the unstyled source screenshot, with sensible missing-image behavior. Exclude handles, guides, and other editor chrome from clean preview.
- [x] Track unsaved changes relative to the user's last explicit project save/open or a fresh composition; exporting or automatic recovery alone must not claim the project is saved. Warn on destructive in-app navigation and register browser leave/reload warnings only when needed. Respect browser limitations.
- [ ] Test undo and redo across uploads, deletion, crop, resets, template application and continuous gestures, including asset lifetime and a new edit after undo.

**Checkpoint:** Users can explore changes safely, compare the result, undo meaningful actions, and receive appropriate warnings before losing unsaved work.

### Phase 7 — Local projects and draft recovery

**Goal:** Preserve and restore complete editable work on the user's device.

- [x] Define a documented versioned project file containing composition settings and original assets. Implement explicit save/download and import with size, schema, version, asset and content validation. Restore without original paths or temporary URLs; do not execute imported content.
- [x] Stage and validate an import before replacing current work. Confirm before discarding unsaved changes; on corrupt, unsupported or incomplete input, show a useful error and leave the existing composition untouched.
- [x] Implement automatic local draft recovery through the storage boundary. Persist composition and necessary asset data consistently, debounce or schedule writes appropriately, and make recovery offer restore/discard rather than silently overwriting a current session.
- [x] Handle storage denial, quota exhaustion, incomplete drafts and interrupted writes visibly without losing in-memory work.
- [ ] Clean up unreferenced assets safely and prevent cleanup from breaking history, drafts, projects or templates. Avoid deleting assets until references from other tabs can be accounted for.
- [x] Explain the difference between automatic best-effort recovery and an explicitly downloaded project backup.
- [ ] Verify save/open and recovery across reload and browser restart without original files.

**Checkpoint:** Projects round-trip with original assets and settings; recovery works after interruption, and storage/import failures do not destroy the current composition.

### Phase 8 — Reusable local templates

**Goal:** Let users reuse a composition's look with new screenshots.

- [x] Define a versioned template model covering canvas, background and its required assets, plus screenshot frame layout, crop behavior and styling. Exclude the original main screenshot. Define a predictable editable fit/crop rule for new images of different aspect ratios.
- [x] Build save/name, list/select, apply, rename, replace and confirmed delete flows. Applying a template must be one undoable action, retain the current screenshot when present, and prompt for one when absent.
- [x] Implement browser persistence through the storage boundary. Store image bytes in appropriate durable browser storage such as IndexedDB, not ephemeral object URLs or assumed filesystem paths; use localStorage only for small suitable metadata. Retain stable references and version data for future migration.
- [x] Make saves and updates atomic from the user's perspective. Handle storage quota, missing assets and deletion safely without corrupting existing templates or the active composition. Explain that clearing browser data can remove templates.
- [ ] Verify multiple templates, rename/update/delete, restart persistence, applying a template with an uploaded background and a differently shaped screenshot, undo, and failure paths. Keep template storage distinct from downloadable project files and recoverable drafts.

**Checkpoint:** A saved template can be reused after a browser restart with its background intact and a new screenshot, without silent data loss.

### Phase 9 — Export and rendering fidelity

**Goal:** Produce reliable, accurate output from the same composition the user sees.

- [x] Implement PNG and JPEG export at selected pixel dimensions, independent of viewport zoom and device pixel ratio. Preserve requested PNG transparency and composite JPEG over a defined opaque matte; provide JPEG quality control and sensible filenames.
- [x] Render all background and screenshot effects, crop, shadows, borders and rounded clipping consistently with the preview. Exclude handles, guides and workspace decoration. Avoid silent fallback to lower resolution or partially rendered output.
- [x] Validate dimensions and device capabilities before or during export; show progress for expensive operations and a useful failure message if rendering or download fails. Preserve the active composition and allow retry.
- [ ] Compare exported PNG and JPEG files against the clean preview at several aspect ratios, resolutions, zoom levels and themes. Inspect pixel dimensions, transparency, matte, and edge/shadow fidelity; investigate browser-specific differences.

**Checkpoint:** Both file formats export at the exact requested size with the intended appearance, or report a clear actionable failure without data loss.

### Phase 10 — Integrated verification, polish, and handoff

**Goal:** Deliver a coherent, complete first release and leave the next developer a reliable reference.

- [x] Run lint, type checking, and the production build.
- [ ] Add and run meaningful automated tests for models, history, validation, project and template round trips, recovery, and export geometry. Select testing tools appropriate to the project and report any checks that cannot run.
- [ ] Exercise the full journey from the home page through editing, save/reopen, template reuse, preview, and both export formats. Test both themes and verify shared token changes propagate to intended components without affecting composition data.
- [x] Inspect and refine the rendered home page and editor at wide, intermediate, and phone sizes. Review both themes and correct the horizontal overflow found at a 320-pixel viewport.
- [ ] Test mouse, touch, keyboard and non-dragging pointer flows, screen-reader semantics, focus management, contrast, and reduced motion. Verify dialogs and bottom-panel behavior.
- [ ] Exercise invalid and oversized inputs, unsupported project versions, missing template assets, storage denial/quota, failed exports, unsaved navigation, reload/restart recovery, and low-resolution warnings. Verify no image uploads or analytics are introduced.
- [ ] Review performance and memory with representative large images; address observed bottlenecks and document device/browser limits. Confirm temporary resources are released and no routine console errors, dead controls, or starter content remain.
- [x] Update the project README with setup, structure, scripts, editor controls, project/template/recovery behavior, supported formats and limits, and material technical decisions.
- [x] Report completed validation and known limitations in the handoff, then request the user's review of the finished work.

**Checkpoint:** All preceding checkpoints and the definition of done below pass; any actual limitations are clearly reported rather than hidden.

## Verification and definition of done

- Run the repository's lint and production build scripts, plus type checking and meaningful automated tests for composition state, history, project round trips/validation, and export calculations. Add suitable test tooling if needed; report any environmental limitations.
- Manually test the complete journey from the home card to export: upload and paste, edit both layers, crop and move, undo/redo, preview, save/reopen, and export both formats. Inspect exported files for correct dimensions and visual agreement with the preview, including transparency and shadows.
- Verify keyboard-only operation, focus, touch interaction, narrow and wide layouts, and supported modern browsers. Exercise invalid images/projects, missing assets, extreme dimensions, insufficient image resolution, and export failures.
- Confirm project reopens after a page reload without access to the original file paths, and editing remains non-destructive. Confirm images are not sent to a server by the application.
- Verify leave warnings, draft recovery and storage failures. Save a template with an uploaded background, reload or restart the browser, apply it to a different screenshot, and verify the saved appearance, editable settings, template management, and error handling.
- Replace starter metadata and content; no broken routes, placeholder controls, console errors during normal use, or unimplemented controls presented as working. Document any real browser or device limits and how the user is informed.

## Explicitly deferred ideas

The earlier discussion recommended these for later, after the core experience is right: browser/device frames, multiple screenshots and side-by-side compositions, text/logos/watermarks, batch creation, and annotations. Reusable local templates and bundled background and shadow presets are in scope now. Accounts, cloud sync, collaboration, billing, analytics, and direct social posting are outside this milestone. Design the boundaries to accommodate future additions, but do not build speculative infrastructure for them.
