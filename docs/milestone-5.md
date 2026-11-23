# Milestone 5: App Store Screenshot Studio

**Status:** In progress  
**Verification date:** 23 November 2026  
**Product:** A local-first editor for building a coherent, ordered App Store screenshot gallery from real app screens.

## Product brief

Screenshot Studio turns a batch of genuine app screenshots into a complete product-page gallery. A project targets one Apple device display size and orientation at a time, contains one to ten ordered screens, and shares a visual system across those screens. Developers can move between presets, inspect the full set, and export exact-size opaque PNG or JPEG files with predictable names. The default target is iPhone with Dynamic Island (medium display); iPad 13-inch is available for apps that support iPadOS.

The first release focuses on the iPhone and iPad screenshot sizes published by App Store Connect. It does not create fake app UI, claim review approval, upload assets, store screenshot data in an account, or support non-image deliverables such as app previews. Device artwork is a neutral, original vector silhouette for composing screenshots; it is not a reproduction of an Apple device or a guarantee of App Store compliance.

## Repository findings and implementation constraints

- The home directory is a three-column desktop grid of tool cards, with the shared header, theme switch, and optional sign-in. Individual tools use the shared header and “All tools” navigation, an `IMAGE TOOLS` eyebrow, a concise title/description, and token-based cards and controls.
- Framecraft and Collage Maker use a single Canvas 2D renderer for both preview and export, separate feature folders, typed composition models, and IndexedDB asset/recovery adapters. Their existing per-image input ceiling is 40 MB, source dimension ceiling 16,000 px, and source pixel ceiling 32 MP. Framecraft caps outputs at 16 MP and uses an 80 MB session fallback. Collage Maker caps project images at 120 MB. Browser storage can be evicted, so both tools recommend downloading a portable project.
- Device Mockups is a separate editor and catalog for bundled laptop/monitor scenes. It does **not** provide phone/tablet templates. This feature will use its own original phone/tablet frame drawings and renderer; no editor coupling or unverified mockup assets are assumed.
- GIF Maker keeps its working media in memory and stacks its controls below the preview on small screens. Existing tools expose file picker, paste/drop where applicable, undo/redo, error/empty states, and accessible alternatives for reorder interactions. Screenshot Studio will follow the shared visual language while using a preview-first phone workspace and a compact screen strip.
- The current home page and GIF Maker page were inspected at 1280×800, and GIF Maker at a 390×844 viewport. The home page uses spacious cards, thin borders, purple primary actions, and a fixed 64 px shared header. At narrow widths GIF Maker stacks preview then settings and keeps the main action in a bottom safe-area-aware bar. Route snapshots for Framecraft, Collage Maker, and Device Mockups confirmed their current editor flows; the Device Mockups catalog may still be loading at first paint.
- The installed Next.js version is 16.4.6. Before implementation, the installed `node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md` and `05-server-and-client-components.md` were read. Routes will stay as thin server components with metadata/loading UI, and browser image/editor APIs will stay inside a Client Component.
- The working tree already contains unrelated modifications and untracked files for auth, Cloudflare/Vite, the home page, README, and Milestone 4. These are user changes and will stay out of this feature's staging and commits.

## Verified App Store requirements

Requirements were checked against Apple's live [Screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/) on **23 November 2026**. Apple states one to ten screenshots per device size; accepted screenshot formats are JPEG/JPG and PNG; screenshots cannot have alpha/transparency. Current submission requirements include at least one iPhone Dynamic Island medium-display screenshot, and an iPad 13-inch screenshot when the app supports iPadOS. The current page lists the iPhone medium-display sizes 1179×2556 and 1206×2622, each with landscape dimensions reversed, and 13-inch iPad sizes 2064×2752 and 2048×2732, also with landscape dimensions reversed. Apple allows screenshots at a higher required resolution to scale down when UI is consistent across sizes/localizations. The catalog will record these facts and accepted alternate sizes explicitly; a local completeness check is advisory and will not imply approval by Apple.

Additional supported older iPhone and iPad sizes are listed in the versioned catalog rather than embedded in editor controls. Screenshot Studio's first release is limited to iPhone and iPad families with portrait/landscape variants. Mac, Apple TV, Vision Pro, Apple Watch, folded iPhone Duo-specific sets, locales, and App Store Connect upload are outside the first-release UI; the catalog can add or retire targets independently as Apple changes its page. Recheck this source whenever the catalog is revised.

## User experience

1. Open **App Store Screenshots** from the home directory and create a named gallery, or restore the last local draft.
2. Select the iPhone or iPad set, a display-size specification, orientation, and one of the focused layouts: full-bleed, device-frame, or caption-led.
3. Add one to ten PNG/JPEG/WebP source images. The editor reports source dimensions, file size, and target compatibility. Originals are retained. Changing source/target aspect ratio shows the crop/letterbox effect explicitly; no screenshot content is silently removed or distorted.
4. Edit the selected screen and shared defaults: headline, subtitle, typography, alignment, line spacing, text color, solid/gradient background, screenshot fit/position, and restrained accent shapes. Individual screens may override gallery defaults. Headline/subtitle overflow and low-resolution upscaling are reported before export.
5. Review a single screen or the full ordered set in a distraction-free presentation view. Reorder with pointer drag plus keyboard shortcuts and a non-drag position selector. Undo, redo, reset, replace, remove, add, and reorder remain available with clear labels and live announcements.
6. Review the exact target pixel size, opaque output, number of complete screens, crop warnings, and resolution warnings. Export one screen or the entire set with stable order-prefixed filenames. Set download is one ZIP organized under a target-size folder; the project is also portable in a versioned `.appshots` file.

Desktop uses a generous live preview with a persistent set/order rail and contextual controls. Mobile uses a preview-first work area, a horizontal thumbnail strip, reachable primary actions, and accessible tabs/expandable controls. No essential task depends on a drag gesture. All layout, colors, borders, radii, focus rings, and shadows use project semantic theme tokens and work in light and dark modes.

## Technical design

### Feature-owned modules

`src/features/app-store-screenshots/` owns the versioned display-size catalog, serializable domain model and validation, presets, renderer, typed IndexedDB boundary, project codec, ZIP writer, editor orchestration, and focused preview/screen-list/settings/presentation components. `src/app/tools/app-store-screenshots/` owns only the thin route and loading state. The home directory registry owns the discoverable card and icon.

### Model and rendering

The JSON composition stores project ID/name, catalog ID and catalog version, orientation, output format, ordered screens with stable IDs and source asset IDs, gallery defaults, optional per-screen overrides, and export naming preferences. Per-screen edits override a single field without mutating defaults. Source binary records are separate from serializable composition state. The renderer takes a validated screen composition, target spec, and decoded local images; it draws an opaque Canvas 2D image. The same deterministic function drives preview, presentation mode, single export, and set export. The display-size catalog includes dimensions, orientation, platform/family, required/advisory grouping, and accepted formats in a single versioned module.

Presets are finite composition recipes, not a general layer editor. Full-bleed keeps screenshot fit/crop explicit; device-frame places the source inside a vector screen mask with a neutral bezel and useful safe-area preview; caption-led reserves a controlled text band. Text uses browser canvas font metrics and explicit bounds; export warnings check text bounds and safe margins. Preview scales the output down without changing source pixels. JPEG is flattened over the selected background. PNG is also opaque to satisfy Apple's no-alpha rule.

### Local persistence and project files

`AssetStore` and `DraftStore` are narrow feature-owned interfaces with an IndexedDB implementation and in-memory fallback. Draft writes are debounced and never call auth, API, database, analytics, or remote image services. Source assets stay in this browser. A versioned `.appshots` portable project embeds validated image bytes and compositions; imports reject unknown versions, missing assets, unsupported MIME types, invalid references, excessive counts/dimensions/bytes, and malformed settings before replacing the current draft. Recovery is best effort because browsers can evict local data. A portable project is the durable backup path.

### Limits and deterministic checks

Follow existing browser-safe ceilings: 40 MB per source image; 16,000 px per side; 32 MP per source; up to 10 source screens; up to 80 MB combined source images for predictable local persistence; output at Apple's exact dimensions, capped at 16 MP per screen. Decode and render one screen at a time. Warn when the source is smaller than the target effective render size, when cover fit crops meaningful edges, or when configured copy exceeds its safe text region. Preserve original image bytes. Storage quota, decoding, canvas allocation, project packaging, and download errors are caught and explained without clearing current edits.

The exact-size PNG/JPEG bytes are generated locally using Canvas `toBlob`; the full set uses a minimal ZIP writer with standard uncompressed ZIP entries and CRC-32, so no additional ZIP runtime dependency or license is needed. ZIP assembly has a finite project/export ceiling and reports failure before download. Browser memory, decoder support, canvas maximum size, IndexedDB quota/eviction, and Blob/download size vary by browser and device; the editor reports observed failures instead of promising capacity. No upload, cloud processing, or account is needed.

### Accessibility, interaction, and privacy

Native buttons, selects, labels, field descriptions, visible focus rings, landmarks, `aria-live` reorder/export status, `aria-pressed` selection, arrow-key movement, and position selection provide keyboard/screen-reader paths. Drag sorting is additive only. Mobile controls meet comfortable touch sizing and use bottom safe-area insets. `beforeunload` warnings cover unsaved work only when the app cannot persist a draft. No screenshot identifiers or asset data are written to auth/account tables.

## Implementation slices

1. **Specification and route shell:** this document, feature-owned catalog/model/validation, route metadata/loading, tool registry card, and responsive editor shell. Keep unrelated user changes out of commits.
2. **Composition and local sources:** original-image intake via picker/drop/paste, dimension inspection, ordered one-to-ten screen list, replace/remove/move, gallery defaults, per-screen overrides, and local IndexedDB recovery/project import/export.
3. **Template renderer and controls:** full-bleed/device-frame/caption-led presets; original phone/tablet vector frames; shared preview/export renderer; text/background/fit controls; crop, resolution, overflow, and safe-area diagnostics; undo/redo/reset.
4. **Presentation and exports:** whole-set and individual inspection, finished/presentation view, exact-size opaque PNG/JPEG export, predictable ordered names, single ZIP, project-size validation, and explicit storage/export error handling.
5. **Directory and delivery:** README/registry updates; review available desktop/mobile preview, keyboard routes, theme states, and real export paths; update this milestone with actual decisions, verification, and known limitations; commit coherent feature-only slices if the worktree allows.

## Acceptance criteria

- [ ] Directory card links to a route with title, concise description, metadata, and a loading state; home/header/navigation conventions are preserved.
- [ ] The versioned catalog reflects the official requirements and date above and exposes current iPhone/iPad target dimensions, portrait/landscape variants, accepted formats, and required versus advisory status without scattering spec constants.
- [ ] User can create and name a project; add one through ten local PNG/JPEG/WebP files; inspect dimensions and order; replace, remove, and reorder with drag, keyboard, and non-drag controls.
- [ ] Three focused layouts use consistent gallery-wide defaults with per-screen overrides. Editing includes copy typography, text color, solid/gradient backgrounds, explicit fit/crop, and restrained accent decoration.
- [ ] Neutral, repo-owned vector phone and tablet templates work without reusing the laptop/monitor catalog. Status/safe areas are represented where applicable; source screenshots remain intact.
- [ ] Preview, finished view, single export, and full-set export share one rendering function. Exact output dimensions and opaque PNG/JPEG behavior match the selected catalog entry.
- [ ] The UI flags insufficient source resolution, visible crop, copy overflow/safe-area issues, incomplete sets, and unsupported/invalid inputs without claiming Apple approval.
- [ ] Undo/redo/reset, error/success/loading/empty states, accessible status announcements, keyboard use, and mobile preview-first layout are present. Essential actions remain reachable without horizontal overflow or dragging.
- [ ] Local draft recovery and a validated versioned portable project include screenshots; no image data is uploaded or associated with an account. Limits and quota/export failures are communicated while retaining edits.
- [ ] Set download generates an ordered target-folder ZIP with predictable filenames; individual downloads remain available.
- [ ] README and tool registry describe the feature and local-only behavior; this milestone records completed work and material limitations.
- [ ] Visual review uses the available live preview at desktop and mobile widths. No tests are added or run unless requested. Report only checks actually performed.

## Decision log and known limitations

| Date | Decision |
| --- | --- |
| 2026-11-23 | First release targets iPhone and iPad screenshot families. macOS, tvOS, visionOS, watchOS, iPhone Duo-specific sets, localizations, and direct upload remain out of scope. |
| 2026-11-23 | Use a feature-owned versioned spec catalog; Apple can change supported sizes, so this catalog requires periodic source re-verification. |
| 2026-11-23 | Create phone/tablet scenes with repo-owned vector artwork. Device Mockups currently contains laptop and monitor scenes only. |
| 2026-11-23 | Keep the product local-only. Browser IndexedDB is best effort; portable project downloads are the durable recovery path. |
