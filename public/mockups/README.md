# Device Mockup Asset Notes

These two initial scene images were generated specifically for this application with OpenAI ImageGen on 2026-11-23. They were not sourced from third-party mockup sites. The generated originals contained blank screens; the repo copies are compressed WebP scenes and smaller WebP previews.

| Template | Scene | Preview | Display corners (normalized) |
| --- | --- | --- | --- |
| `laptop-desk-01` | `laptop-desk-01/scene.webp` | `laptop-desk-01/preview.webp` | `(0.219, 0.139)`, `(0.777, 0.139)`, `(0.777, 0.635)`, `(0.219, 0.635)` |
| `monitor-room-01` | `monitor-room-01/scene.webp` | `monitor-room-01/preview.webp` | `(0.165, 0.072)`, `(0.824, 0.132)`, `(0.829, 0.679)`, `(0.169, 0.728)` |

The display geometry and screen aspect ratios are defined in `src/features/device-mockups/catalog.ts`. Keep those values aligned with the visible display area when replacing an asset. These images were generated for use in the application and in user exports; new catalog assets must also have distribution and export rights documented here.
