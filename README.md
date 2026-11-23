# Tools by Desphixs

**Tools** is a small collection of practical image and media editors that run in your browser. Use them to style a product screenshot, build a collage, make a GIF, and more.

Try them here: [tools.desphixs.com](https://tools.desphixs.com)

This is an open-source project, and contributions are welcome. If you find a bug, have an idea, or want to build something with us, jump in.

## What you can make

| Tool | What it does |
| --- | --- |
| [Screenshot Styler](https://tools.desphixs.com/tools/framecraft) | Add a background, crop, border, or shadow to product screenshots, then export a high-resolution image. |
| [Collage Maker](https://tools.desphixs.com/tools/collage-maker) | Arrange photos in grids or custom layouts and export the finished collage. |
| [Device Mockups](https://tools.desphixs.com/tools/device-mockups) | Place a screenshot into a laptop or monitor scene and adjust how it fits the screen. |
| [App Store Screenshots](https://tools.desphixs.com/tools/app-store-screenshots) | Create a set of store-sized iPhone or iPad screenshots with layouts and captions. |
| [GIF Maker](https://tools.desphixs.com/tools/gif-maker) | Turn a video clip or image sequence into an animated GIF. |
| [Social Asset Pack](https://tools.desphixs.com/tools/social-asset-exporter) | Adapt one design to several social image sizes and download the set as a ZIP. |

Here is what each editor can do:

- **Screenshot Styler:** Set up a landscape, portrait, square, or custom canvas. Use a solid color, gradient, or image background, then adjust screenshot fit, crop, position, border placement, and inner or outer shadows. Save templates and projects, and export PNG or JPEG.
- **Collage Maker:** Build grids and diagonal layouts with up to 36 image cells. Adjust each image, cell shape, spacing, border, and background, then export a PNG or JPEG. Projects can be downloaded and reopened later.
- **Device Mockups:** Pick a laptop or monitor scene, add a screenshot, and tune its fit, zoom, and position in the screen. Preview the finished scene and export at its original size or twice the resolution. Project files keep the image and settings together.
- **App Store Screenshots:** Arrange one to ten screens for an iPhone or iPad display size and orientation. Use a shared layout, customize text for individual screens, review size and crop warnings, and export exact-size PNG or JPEG files or an ordered ZIP.
- **GIF Maker:** Use a local MP4 or WebM clip, or a sequence of 2 to 30 images. Trim video, reorder images, choose the output size and frame rate, and set the loop behavior. GIFs have no audio and are limited to 640 pixels on the longest side.
- **Social Asset Pack:** Start with one master image and choose from the current Pinterest, YouTube, YouTube Shorts, and LinkedIn placement presets. Fit or crop each size, adjust its focal point, optionally add brand text, colors, or a logo, then download the pack as a ZIP. Presets are helpful starting points, not a promise of platform approval.

## How it works

The editors are built around a canvas. Add your files, make changes in the editor, preview the result, and export it. Most image work happens in your browser. Images and project data stay in browser storage or in files you choose to download. The app does not upload your designs for server-side image processing.

Some tools save drafts in IndexedDB so you can pick up where you left off in the same browser. Browser storage is best effort and can be cleared, so download a project file when you want a portable backup. Sign-in is optional. Account and session details are stored separately from your images and project files.

## Run it locally

You will need Node.js and pnpm.

~~~bash
git clone <your-fork-url>
cd tools
pnpm install
pnpm dev
~~~

Open [http://localhost:3000](http://localhost:3000).

The standard local app runs with Next.js. There is also a Vinext development command for working with the Cloudflare runtime:

~~~bash
pnpm dev:vinext
~~~

### Optional sign-in and database setup

The image tools can be explored without setting up Google sign-in. To work on authentication, copy `.env.example` to `.env.local` and fill in the values for a development database and Google OAuth app:

~~~text
DATABASE_URL=
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
~~~

For local Google OAuth, use `http://localhost:3000` as an authorized JavaScript origin and `http://localhost:3000/api/auth/callback/google` as the redirect URI. Use a development database for local work, never production credentials. The schema commands are:

~~~bash
pnpm db:generate
pnpm db:migrate
~~~

Keep `.env.local`, database URLs, OAuth secrets, and other credentials out of commits.

## Project map

~~~text
src/
  app/                         Routes, layouts, sitemap, and robots rules
  components/                  Shared interface components and tool thumbnails
  features/                    Tool-specific editors, models, renderers, and storage
  lib/tools.ts                 Tool directory, card copy, and SEO details
  lib/seo.ts                   Shared metadata and structured-data helpers
docs/                          Tool milestones and implementation notes
public/mockups/                Device Mockups scenes and asset notes
~~~

Each tool keeps its editor and domain logic in its own folder under `src/features`. Shared interface pieces belong in `src/components`. The tool directory and its search metadata live in `src/lib/tools.ts`. Routes should stay small and connect the tool page to its feature.

The editors use browser APIs such as Canvas and IndexedDB for image rendering and local recovery. Tool projects have their own limits and file formats, so check the tool page and its milestone notes before changing those details. For example, GIF exports have no audio and use a limited color palette, and social placement sizes are useful presets rather than a guarantee that every platform will accept an upload.

## Want to contribute?

Glad you're here. A simple issue or pull request is great. For larger changes, open an issue first so we can talk through the idea before you spend time building it.

1. Fork the repo and create a branch for your change.
2. Keep the change focused. Tool-specific work should stay in that tool's feature folder where possible.
3. If you add or rename a tool, update its route and entry in `src/lib/tools.ts`. Include a clear name, short description, SEO description, keywords, features, and thumbnail.
4. Keep the UI responsive, accessible, and consistent with the existing light and dark themes. Provide keyboard or form controls for important canvas actions when possible.
5. Run the checks that fit your change, then open a pull request with a short summary, what you tried, and screenshots or a screen recording for UI changes.

Useful commands:

~~~bash
pnpm lint
pnpm typecheck
pnpm build
~~~

There is no separate test command configured right now. If your change adds tests or a new check, include the command contributors should run in your pull request.

## Search and sharing

Each public page has its own title, description, canonical URL, Open Graph and Twitter metadata, and structured data. The homepage and available tools are listed in the sitemap. Robots rules allow public pages to be crawled and keep API routes out of search results. When you add or rename a tool, keep the SEO fields in `src/lib/tools.ts` accurate so the page metadata and sitemap stay in sync.

## Deploying

The live site runs on Cloudflare Workers. The project has a Cloudflare deployment setup and persistent KV cache binding. Deployment is for contributors with access to the Cloudflare account and the configured secrets:

~~~bash
pnpm deploy:vinext
~~~

Do not commit deployment credentials or copy production secrets into a local environment. Ask a maintainer if you need help with access or environment setup.

## License

This project is released under the MIT License. You can use, change, and share the code as long as the copyright and license notice stay with it. See [LICENSE](LICENSE) for the full terms. Third-party dependencies and assets keep their own licenses.
