# Milestone 6: Batch Social Asset Exporter

**Status:** Complete
**Specification verification date:** 23 November 2026  
**Product:** A local-first editor that turns one master image into a reviewed, downloadable pack of social placements.

## Product brief

Batch Social Asset Exporter creates a coordinated set of image files from one high-resolution source. Users name a pack, choose one or more supported placements, add a local source image, inspect every output, and download the whole set as one ZIP archive. Each output is rendered directly from the original source, with independent crop position where needed. The first release is deliberately small and has a maintained, versioned placement catalog rather than claiming broad platform coverage.

The first release supports these four placements:

| Platform and placement | Output dimensions | Official source |
| --- | ---: | --- |
| Pinterest · Standard Pin | 1000 × 1500 | [Pinterest product specifications](https://help.pinterest.com/en/business/article/pinterest-product-specs) recommends a 2:3 aspect ratio or 1000 × 1500 px. |
| YouTube · Video thumbnail | 3840 × 2160 | [YouTube custom thumbnail guidance](https://support.google.com/youtube/answer/72431?co=GENIE.Platform%3DDesktop&hl=en-on) recommends 3840 × 2160 px and a 16:9 aspect ratio for videos. |
| YouTube · Shorts thumbnail | 2160 × 3840 | [YouTube custom thumbnail guidance](https://support.google.com/youtube/answer/72431?co=GENIE.Platform%3DDesktop&hl=en-on) recommends 2160 × 3840 px and a 9:16 aspect ratio for Shorts. |
| LinkedIn · Single image ad, landscape | 1200 × 628 | [LinkedIn single image ad specifications](https://www.linkedin.com/help/linkedin/answer/a427596/) lists 1200 × 628 px at 1.91:1 as the recommended horizontal size. |

These are recommended creator specifications, not acceptance guarantees. Platform requirements can change; the catalog includes source links and a verification date and is easy to review and update. The tool does not connect to social accounts, post assets, measure analytics, upload files to a server, or claim that a platform accepted an export.

Lossless PNG output can preserve rendered pixels. Resizing, cropping, or converting a lossy source necessarily changes pixel data; the tool explains that clearly. It keeps the original file bytes unchanged, produces each selected placement directly from the source, and defaults to PNG. Cropping is explicit, meaningful downsampling is flagged, and upscaling must be acknowledged; it does not distort or substitute assets, chain resizing, or apply lossy compression without a format choice. Explicit JPEG/WebP export has user-controlled quality. When source and output dimensions and format match and there are no edits, the original bytes may be copied exactly.

## Repository findings and implementation constraints

- The home directory uses a shared 64 px header, restrained bordered cards, purple primary actions, and a three-column desktop tool grid that stacks on phone. The new card belongs in `src/lib/tools.ts` and links to a separate route.
- Framecraft, Collage Maker, Device Mockups, and GIF Maker are independent feature folders. Framecraft and Collage Maker use Canvas 2D for preview/export and IndexedDB for local source assets and recovery; Device Mockups has its own catalog/renderer/storage; GIF Maker keeps media in memory and uses a feature-local worker. This feature owns its model, editor, renderer, archive and project boundaries. It does not read Framecraft state.
- Desktop patterns use a large preview beside contextual controls or a pinned settings column. At 390 px, Framecraft puts its preview first and controls below; Collage Maker stacks its canvas and compact controls; Device Mockups stacks the template list, preview and controls; GIF Maker stacks source preview then settings. The new tool uses the same tokens and interaction conventions, with a mobile preview-first flow and a reachable export action.
- Next.js 16.4.6 documentation under `node_modules/next/dist/docs/01-app/` was reviewed before implementation, including App Router pages/layouts, CSS, Metadata, and Image Optimization. Route files will remain thin; metadata is exported from the server route while the editor is a client component.
- The installed dependency set includes no ZIP library. The implementation will use a focused, bounded ZIP writer with stored (uncompressed) entries, UTF-8 paths and CRC-32 rather than adding a broad archive dependency. Export checks file count, output pixels, and aggregate bytes before creating the archive.

## End-to-end workflow

1. Open Batch Social Asset Exporter from the home directory.
2. Name the pack and select one or more placements from the catalog. Each choice shows platform, placement, aspect ratio, and pixel dimensions.
3. Add one PNG, JPEG, or WebP master image from the local device. Preserve the source bytes. Reject unsupported or oversized files with an actionable message while retaining the existing pack.
4. Preview all selected placements from the original asset. Default to **Fit** so the complete source remains visible; show transparent or selected solid fill around it. **Crop** is an explicit choice and starts with a ratio-based focal recommendation. Each output has independent focal X/Y controls and numeric alternatives to pointer adjustment.
5. Review the pack overview and each output's dimensions, ratio, source/output resolution, chosen format, estimated/actual encoded size, crop/fit state, and warnings. Warn before export when the source would be enlarged, meaningfully downsampled, or content is cropped, or when an output is missing. These warnings do not claim platform rejection or acceptance.
6. Optionally apply shared headline/caption and a small brand preset (accent color, typeface choice, optional local logo). Text and logo are rendered at final output resolution. Overrides are placement-local and never alter another variant.
7. Download a ZIP with stable, descriptive files under platform/placement folders. PNG is the default. JPEG/WebP are explicit choices with user-visible quality controls; no size-target compression is performed. A failed render/download/storage operation leaves the in-memory project intact and reports the failure.
8. Save/reopen a versioned `.socialpack` project containing validated settings and local image data. IndexedDB recovery is best effort; the downloaded project file is the portable backup.

## Product behavior and interaction

- One master image is the primary and complete first-release workflow. Multi-image sequencing is out of scope.
- Placement selection and source upload can happen before editing; once a source exists, the editor shows a pack overview, active preview, variant navigation, and contextual controls.
- Smart fit/crop recommendations compare source and target aspect ratios. **Fit** preserves all source content. **Crop** is explicit and its crop region is visible and adjustable. Fit/crop, focal point, background, and optional overlay/safe inset are shared defaults with sparse per-placement overrides.
- Preview and export call the same composition math. The preview uses a downscaled display canvas; export draws the original decoded image to the exact target dimensions. The renderer enables high-quality Canvas interpolation and draws overlays at final resolution.
- Provide set overview, per-variant preview, clean presentation mode, undo/redo for meaningful edits, accessible variant thumbnails/buttons, and status feedback for empty, loading, error, saved, and exported states.
- Provide keyboard focus and navigation, explicit buttons/number fields as alternatives to dragging, screen-reader names/status, and touch targets of at least 40 px. Do not trap mobile scroll in a control sheet.
- The mobile layout is preview first, then a wrapping/horizontally scrollable labelled variant chooser, then controls in tabs/sections. Keep **Download set** reachable in a sticky safe-area-aware action bar. Avoid horizontal page overflow.

## Technical design

Feature files are grouped under `src/features/social-asset-exporter/`:

- `model.ts`: versioned pack, source, brand, placement state, image limits, and validation for imported and saved projects.
- `catalog.ts`: typed, versioned official placement specifications with dimensions, ratios, source URLs and verification date.
- `render.ts`: pure layout math plus browser Canvas preview/export renderer. Every output resolves the master source and its own defaults/override directly.
- `storage.ts`: typed IndexedDB project/recovery adapter, independent of composition and renderer logic.
- `project-file.ts`: bounded project import/export and image metadata validation.
- `zip.ts`: narrow ZIP store writer with safe normalized paths, CRC-32, and hard file/byte/pixel bounds.
- `social-asset-exporter-editor.tsx` and focused controls/components: client-side editor state, history, file selection, preview, controls, and export orchestration.
- `src/app/tools/social-asset-exporter/page.tsx` and `loading.tsx`: thin route, metadata and semantic loading shell.

Source PNG/JPEG/WebP files are capped at 40 MB, 16,000 px per side, and 32 MP; logos are capped at 10 MB and the combined project asset limit is 50 MB. Per-output dimensions are fixed by the catalog and capped at 16 MP; the pack is capped at 24 MP of aggregate output pixels, four files, and 100 MB of archive bytes. Project imports validate schema, catalog IDs, timestamps, image MIME/signature, decoded dimensions, and data size before replacing the active project. Failed imports are staged and committed only after full validation.

Composition data, transient selection/history, renderer, and browser persistence remain separate typed boundaries. Projects include the source image and project settings; recovery storage is browser-local and may be evicted. There is no account, cloud save, server-side processing, or application upload endpoint.

### Image quality and browser limits

PNG is the default lossless container. Canvas rendering can preserve alpha and rendered pixel values, but browsers may decode color profiles differently, and Canvas `toBlob()` output can vary by browser. It cannot preserve original metadata/ICC profiles after a transform and cannot guarantee byte identity after re-encoding. Exact original bytes are used only for a true no-op with matching dimensions and format. Canvas memory and maximum dimensions vary across browsers and devices; constrained devices can still fail to allocate an output canvas. The tool reports failures and keeps the project editable. It does not promise physically impossible zero pixel change for resizing, crop, overlay or lossy conversion.

## Responsive UX and visual system

Use the existing semantic theme tokens, shadcn/ui controls, shared `AppHeader`, borders, radii, focus rings, and light/dark theme support. Keep social brand colors and user typography in pack data, not app theme tokens. The user-controlled safe inset is 4–14%; it guides text/logo placement and is shown in preview only, not included in exports. Desktop shows overview/variant list, a large preview, and contextual settings with primary export visible. Tablet may narrow the controls but retains preview and output metadata. Mobile uses a full-width preview, accessible variant strip, collapsible native details for optional controls, and sticky export. Errors and warnings appear next to the affected source, variant or export action.

## Implementation phases

1. Document current repo findings, quality policy, verified initial catalog, feature boundaries, and acceptance criteria.
2. Add typed catalog and pack models, input/project validation, Canvas renderer and bounded persistence/project/ZIP boundaries.
3. Build the responsive one-source/many-placements editor with selection, per-variant crop controls, overview/warnings, preview mode, optional brand/text, history and export.
4. Integrate route, metadata/loading, discoverable home card, and README; refine styling and keyboard/mobile interactions.
5. Review desktop, tablet and phone using the app preview; inspect export behavior and application diagnostics without adding or running tests (per repository instructions). Record actual results and any browser limitations below.

## Acceptance criteria

- [x] Discoverable home tool card, working route, metadata and loading state.
- [x] Name pack, select one or more catalog outputs, add one local master source, preserve source bytes and recover work after errors.
- [x] Each output previews from the original; per-output focal/crop/layout changes are isolated, visible and keyboard-adjustable.
- [x] Show dimensions, aspect ratio, output format/size and source-resolution/crop/upscale/downsample warnings before export; cropping is explicit, upscaling is acknowledged, and meaningful downsampling is flagged.
- [x] PNG is default; optional lossy formats and quality settings are explicit. Transformed outputs use final-resolution rendering and high-quality interpolation; true no-op may reuse exact source bytes.
- [x] One-action ZIP contains normalized platform/placement paths and stable descriptive filenames; archive input and resource bounds are validated.
- [x] Versioned `.socialpack` project round-trips source and settings; local recovery is behind a typed persistence boundary.
- [x] Accessible variant navigation, visible focus, keyboard and numeric pointer alternatives, sufficient touch targets, and empty/loading/error/success feedback.
- [x] Light/dark, desktop/tablet/mobile layouts match the existing design system; mobile has no horizontal overflow and keeps export reachable.
- [x] `README.md` and this document describe actual implementation and verified manual review; no direct posting, analytics, or server uploads are added.

## Progress and verification log

- 2026-11-23: Inspected the repository, home directory, Framecraft, Collage Maker, Device Mockups, GIF Maker, and semantic design tokens. Reviewed the existing tools at desktop and phone widths. Read the installed Next.js 16.4.6 App Router, CSS, metadata, and image documentation before application code.
- 2026-11-23: Verified Pinterest Standard Pin (1000 x 1500), YouTube video thumbnail (3840 x 2160), YouTube Shorts thumbnail (2160 x 3840), and LinkedIn landscape single-image ad (1200 x 628) against the official pages linked above. The catalog records the recommended dimensions, URLs, and verification date.
- 2026-11-23: Implemented the versioned catalog/model, image signature and project validation, source-to-output Canvas renderer, IndexedDB recovery boundary, .socialpack import/export, bounded four-entry ZIP writer, responsive editor, placement-local crop/focal controls, brand settings, safe inset guides, whole-pack preview, quality overview, route metadata/loading state, and home directory card. Updated README.
- Manual workflow: Loaded a 1600 x 900 local PNG, reviewed all four outputs and the whole-pack preview, adjusted one placement's crop, confirmed the upscaling warning, and downloaded the ZIP. Inspected its four platform/placement paths and exact output dimensions; entries are stored without compression. Saved and reopened a .socialpack project and confirmed its source and placement override remained available.
- Responsive review: Inspected the editor in light and dark themes at 1280 x 800, 820 x 1024, and 390 x 844. Phone and tablet have no horizontal overflow; mobile keeps preview first, variant selection available, and download in a safe-area-aware sticky action bar. The home directory shows the new card at desktop and phone widths without horizontal overflow.
- Verification: pnpm typecheck, targeted ESLint for the Milestone 6 feature/route/tool registry, and pnpm build pass. Full pnpm lint reports three existing react-hooks/set-state-in-effect errors and four warnings in src/features/device-mockups/device-mockups-editor.tsx; it reports no Milestone 6 findings. No automated tests were added or run, per repository instructions.
- Browser limits: Canvas 2D toBlob output and color-profile decoding can vary by browser. Transformed exports do not preserve original metadata or ICC profiles, and device canvas-memory limits can prevent large exports. Export errors leave the project editable.
