# Lightweight hybrid guide videos

## What changed

The existing `/guides` route now renders `VideoGuideLibrary` after its original written links and identification-photo instructions. `/guides/measurements` and its measurement instructions are unchanged. No new application route, video upload endpoint, storage integration, database or authentication was added.

There are currently **no approved tutorial sources in the repository**, so `src/config/video-guides.ts` is deliberately empty. The page says no video tutorials are published and links to written guidance. Development fixtures are not entries in this catalog and are never served as public tutorials. Add actual approved content to the configuration when available; no player implementation change is needed.

## Components and configuration

- `src/components/guides/hybrid-video-player.tsx`: reusable client component accepting typed `title`, `source` and `thumbnail` props. It uses React, Next.js Image and native browser elements, with no video-player SDK.
- `src/components/guides/video-guide-library.tsx`: server-rendered catalog wrapper with titles, hardware categories, creator attribution and related written-guide links.
- `src/components/guides/video-guides.css`: scoped responsive 16:9 media frames and existing PartSolved colors, rounded corners and accessible tap targets.
- `src/types/video.ts`: discriminated YouTube/MP4 source union, local thumbnail dimensions/alt text, hardware categories, creator name/optional HTTPS credit URL and related guide titles/paths. MP4 can include a local WebVTT captions track.
- `src/config/video-guides.ts`: the only production tutorial catalog. No development fixture or unreviewed tutorial is included.
- `src/lib/video-source.ts`: constructs official privacy-enhanced embed URLs and validates the 11-character YouTube ID. MP4 paths must be same-origin MP4 files; protocol-relative/remote sources are rejected.

To publish a guide, supply an approved video ID or actual same-origin MP4 path, a permitted optimized image under `public/images/`, its actual dimensions and descriptive alt text, a title, appropriate hardware-category slugs, creator credits and existing related written-guide links. Place approved self-hosted MP4 files at the configured same-origin path; this release does not add external storage or upload infrastructure. Provide accurate captions for spoken self-hosted content when available. YouTube captions use the provider's native controls. Do not copy or proxy YouTube video media.

## Loading, playback and privacy

Initial rendering contains a lazy local Next.js Image thumbnail and a keyboard-accessible Play button. There is no iframe, MP4 element, provider script, media preload link, preconnect or YouTube thumbnail request.

Choosing Play mounts the appropriate native player:

- YouTube: `https://www.youtube-nocookie.com/embed/{id}?playsinline=1&rel=0`. No autoplay parameter, JavaScript player API or autoplay permission is enabled. No YouTube connection is made until that action.
- MP4: native `<video controls playsInline preload="none">`, with autoplay disabled. It does not fetch MP4 media before the user activates the native Play control. Optional caption tracks are local.

The initial button opens the player; the user then presses its own Play control to start playback. This extra step is intentional to honor the no-autoplay requirement and is explained beside the player. A configured title labels the media element and Play action. Focus moves into the activated player; Close video restores the thumbnail and focus to Play.

Closing, unmounting or replacing a source removes the iframe and its browsing context. MP4 cleanup also pauses playback, removes the source and invokes `load()` to release media resources and abort pending work. A different source key resets the player to its thumbnail.

A Watch on YouTube or Open MP4 directly link is always available for valid sources, including before activation. These normal links open a new tab with `noopener noreferrer` and do not use Next.js prefetch. Media error events show a readable fallback message. Cross-origin YouTube restrictions are not reliably detectable from the parent page; the persistent fallback link remains usable even when a browser only reports an iframe load rather than an error. Privacy-enhanced embeds still connect to YouTube and may process viewing data after activation; the UI explains this without claiming anonymous or cookie-free playback.

## Tests and fixtures

`tests/video-player.spec.ts` exercises the production component in a private browser harness intercepted by Playwright. The harness is **not a Next.js route** and cannot be reached on the deployed application. It is bundled using Next's existing compiler plus TypeScript, adding no dependency. Generated bundles stay under ignored `test-results/` and are excluded by the existing lint configuration.

- `tests/fixtures/hybrid-video-harness.tsx`: test-only React mounting/unmounting.
- `tests/helpers/build-video-harness.mjs` and `tsx-loader.mjs`: isolated test bundling.
- `tests/fixtures/video-smoke.mp4`: a 2-second, silent black development clip generated locally with FFmpeg, not a tutorial, YouTube download or public asset. FFmpeg is not required to run tests because the tiny fixture is committed.
- YouTube requests are intercepted with explicit development HTML; no actual YouTube media is downloaded or played during testing.

Coverage includes URL validation, zero initial embeds/provider requests, lazy local thumbnails, keyboard activation, no autoplay, preload-none behavior, actual native MP4 playback, media failure/fallbacks, close/unmount cleanup, source replacement, 16:9 dimensions and overflow at 320/375/390/430/768/1280px, and preservation of public written Guides content and measurement navigation.

Final checks: lint (no warnings/errors), TypeScript validation and the production build passed. The full Chromium regression suite completed with **56 passed, 2 skipped** in 3.2 minutes. The existing skips are duplicate mobile-project viewport loops covered by the desktop project. All ten new player cases passed across desktop and mobile Chromium, including actual native MP4 playback and intercepted YouTube activation checks.

Commands:

```sh
npm run lint
npm run typecheck
npm run build
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:e2e -- --workers=1
```

The browser environment uses installed Chromium; other environments can use their Playwright browser installation. The test harness is development-only. No actual approved YouTube playback, physical mobile device, Safari or Firefox verification is claimed. Existing written content remains usable without any video configuration.
