## Development workflow

- Commit work in meaningful, coherent slices as implementation progresses; do not wait until the entire milestone is finished. Use clear commit messages, verify each slice appropriately, and avoid including unrelated user changes.

## UI and copy

- Prioritize clean, modern, intuitive interfaces with simple layouts, clear hierarchy, readable typography, comfortable spacing, and restrained decoration. Avoid clutter, unnecessary visual effects, and generic AI-generated styling.
- Keep controls easy to understand and related actions logically grouped. Keep essential actions discoverable without adding unnecessary explanation. Minimalism must not compromise accessibility or clear feedback.
- Write concise, plain, human-readable labels, descriptions, and messages. Omit text that does not help users understand or complete a task. Avoid marketing language, filler, jargon, and generic AI-sounding copy. Explain errors clearly and say how to resolve them when possible.
- Make thoughtful visual and layout decisions autonomously, implement and refine the finished interface, and present it for review when the work is complete. Do not require the user to approve routine design decisions along the way.
- Design responsive interfaces deliberately: keep essential actions usable on desktop and mobile, show common controls first, and group advanced settings clearly. Provide accessible keyboard and non-dragging pointer alternatives for drag interactions.

## Code organization and styling

- Keep the codebase clean and organized as new tools are added. Group each tool's domain logic, components, and assets by feature; place genuinely shared UI and utilities in clear shared locations. Use focused files and descriptive names, keep routes thin, and avoid unrelated catch-all files and unnecessary cross-tool coupling.
- Centralize shared UI colors, theme values, borders, radii, and shadows in semantic design tokens and shared component styles, using the project's Tailwind and shadcn/ui conventions. Support light and dark themes throughout. Local layout utilities can remain local; user-controlled composition styling is project data, not a UI token.
- Separate domain models and editor logic from persistence and infrastructure. Use small, typed boundaries so browser storage can later be complemented by database or cloud implementations without a total rewrite; avoid speculative infrastructure.
