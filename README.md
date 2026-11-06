# PartSolved-

Windows/Doors Photo Identification Application

## Milestone 1: Application foundation and homepage

Next.js App Router, React, strict TypeScript, Tailwind CSS, and Lucide React. No backend, account system, supplier connection, checkout, or photo matching is implemented.

### Run locally

Use Node.js 22 or later (verified with Node 24) and npm:

```sh
npm ci
npm run dev
```

Open http://localhost:3000. To preview the production build:

```sh
npm run build
npm start
```

No environment variables or API keys are required. The project is ready for standard Next.js hosting on Vercel, but this milestone does not provision or deploy services.

### Checks

```sh
npm run lint
npm run typecheck
npm run build
npx playwright install chromium
npm run test:e2e
```

Browser tests start the production server, so build first. If Chromium is already installed, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to its absolute path instead of downloading a browser. Tests cover desktop and mobile Chromium, file pickers, validation, local preview and replacement, route navigation, recovery after refresh, keyboard dismissal, focus restoration, and overflow from 320px to 1280px. Responsive screenshots and failure traces are saved under `test-results/` (not committed).

ESLint 9 is used because the React, import, and accessibility plugins bundled with the current Next.js ESLint config do not yet declare ESLint 10 support. Do not upgrade it independently without checking those peer dependencies.

### Temporary photo handling

The camera input uses `accept="image/*" capture="environment"`; the upload input has no capture preference. Camera support depends on the browser/device, with the native file picker as the fallback. Photos must be nonempty browser-decodable images up to 10 MiB; SVG is excluded as a non-photographic format.

Files stay in a React context under the shared root layout, surviving client-side navigation to `/find-part/details`. Refreshing, closing the tab, or loading the URL in another tab discards them and shows a recovery action. Preview object URLs are revoked on replacement/unmount. No photo bytes are uploaded or stored in localStorage, cookies, or a database.

### Routes and component boundaries

- `/`: reference-based homepage, responsive navigation, photo capture/upload, category cards, and guidance banner.
- `/windows`, `/doors`: category landing scaffolds.
- `/categories/window-hardware`, `/categories/door-hardware`, `/categories/window-parts`, `/categories/door-parts`: honest empty catalog scaffolds.
- `/find-part/details`: local photo handoff and recovery state.
- `/find-part/guided`, `/guides`, `/support`: clearly labeled initial scaffolds.
- Search, favorites, and account use accessible native dialog panels. Search accepts input but explicitly states the catalog is not connected.

`src/components/` separates layout, homepage, UI, and part-finder features. `src/config/categories.ts` centralizes category presentation metadata and stable slugs; it contains no inventory or prices. `src/config/photography.ts` holds the future approved hero and measurement photos. Shared brand and layout tokens live in `src/app/globals.css`.

### Photography and known limitations

The approved reference was supplied as a single screenshot, with no separate high-resolution logo or licensed hardware photography. As requested, **all six photographic areas are clearly labeled temporary slots**. No AI-generated hardware, unlicensed supplier images, screenshot crops, or unrelated stock photography is used. The logo is an SVG/text recreation with a separate subtitle. See [the photography checklist](public/images/README.md) for required assets and rights documentation. Approved photos can be configured without redesigning the page.

Catalog data, photo matching, guided questions, videos, saved favorites, sign-in, partner ordering, and checkout remain unavailable. The reference copy describes the future journey; the homepage explains that matching and partner ordering are coming later.

Physical Android camera behavior and Safari/Firefox still require device/browser verification. Chromium mobile emulation confirms the picker wiring and responsive behavior, not actual camera capture.
