# Guided Finder photograph update

The existing `/find-part/guided` common-parts selection and Review Possibilities screens now use all ten photographs from the user-supplied `PartSolved_10_Optimized_Images.zip`. No new page or duplicate finder was created.

## Image mapping and provenance

All files live under `public/images/part-families/`. See [the full ten-family filename mapping and usage authorization](../public/images/part-families/README.md). Each WebP is 1100 × 733 pixels; combined file size is 513,004 bytes. Every extracted file was compared byte-for-byte with its ZIP entry. No photo was cropped, generated, reconstructed or re-encoded. The user explicitly approved the named storm-door-closer file in the ZIP after the earlier duplicate-closer discrepancy was identified.

## Implementation

- `src/config/assistance.ts`: replaces the nine existing family image references with the supplied local assets and adds the previously absent sliding-window track/fin-lock card, using the existing supported intake type.
- `src/components/part-finder/assistance/hardware-illustration.tsx`: the shared `FamilyImage` uses Next.js Image for every family. The obsolete gray hardware SVG fallback is removed. The interactive window/door location diagrams remain intact.
- `src/components/part-finder/assistance/assistance.css`: photo areas use the common native aspect ratio, responsive widths and `object-fit: contain`, on the existing light background. Whole hardware compositions remain visible on mobile and desktop.
- `src/types/assistance.ts`: makes a family photograph required, so future cards cannot silently fall back to a missing image.
- `tests/family-photographs.spec.ts`: verifies all ten local image responses, decoded images, file-to-card mappings, full-composition styling, responsive bounds/tap targets, corresponding images in results, selections/rejections across navigation, and the existing track/fin-lock details handoff.

The same existing `FamilyCard` and `FamilyImage` instances render both gallery and results. Existing titles, descriptions, May help with text and action handlers are unchanged for the original nine cards. Existing automatic rules in `src/lib/assistance.ts`, questionnaire choices, state provider, primary photo picker, preview, Add Details and measurement help were not modified. The added tenth card uses the same selection and handoff logic as the others. No supplier products, prices, inventory, compatibility guarantees or matching claims were added.

## Run locally

```sh
npm run build
npm run start
```

Open `/find-part/guided`, choose **Need a simpler way?**, then **Show Me Common Parts**. Select **This Looks Similar** and **Review Possibilities** to see the same photo in results. No additional setup, dependencies, environment variables or deployment changes are required.

## Verification

Final results: lint (no warnings/errors), TypeScript validation, production build and staged diff checks passed. The full browser suite finished with **48 passed, 2 skipped** in 4.6 minutes. Both existing skips are duplicate mobile-project viewport loops; their checks execute in the desktop project. All ten-photo gallery/results checks passed on desktop and mobile Chromium, with no page errors. Commands used: `npm run lint`, `npm run typecheck`, `npm run build`, and `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:e2e -- --workers=1`. The last command uses the environment's installed Chromium; other environments can use a Playwright-installed browser.

The photo test checks widths 320, 375, 390, 430, 768 and 1280px, exercises each of the ten family selections/results on desktop and mobile Chromium, and saves gallery/results screenshots under ignored `artifacts/family-photographs/`. Existing homepage, photo capture/upload, details, guided assistance, measurement and review regressions are included in the full suite. Physical phone camera behavior and Safari/Firefox are outside this image-only verification.

No automatic merge or manual production deployment is part of this task. The existing GitHub/Vercel integration may produce a feature-branch preview for review.
