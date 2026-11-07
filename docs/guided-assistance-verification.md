# Guided assistance verification

Verified 6 November 2026 against the local production build on branch `feat/guided-not-sure-assistance`, based on `main` at `158dc095`.

## Results

| Check | Result |
| --- | --- |
| `npm ci` | Passed using the existing lockfile; no dependency changes |
| `npm run lint` | Passed, no warnings/errors |
| `npm run typecheck` | Passed |
| `npm run build` | Passed; existing route structure retained |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:e2e -- --workers=1` | **46 passed, 2 skipped**, final run 3.1 minutes |
| `git diff --cached --check` | Passed |
| Additional production-browser checks | Passed: four supporting-photo limit, cancellation, assistance reset preserving original answers and primary photo |
| Final screenshots / browser console | Passed at 320px, 375px and 1280px, no horizontal overflow or page errors during the captured assistance journeys |

The two skips are existing mobile-project duplicates of comprehensive viewport-loop tests; those loops run in the desktop project. No active test failed in the final run. Browser testing initially caught extra diagram text in radio labels and inconsistent accessible family-action names; both were corrected before the final passing suite.

## Coverage

- Every original answer unknown, early unknown-answer help and original-question recovery.
- Known location with unknown part; symptom-only identification without photos or measurements.
- Adaptive symptom choices and patio sliding follow-up; changing location clears dependent answers.
- Multiple plausible families, customer exclusions and honest insufficient-evidence results.
- Native keyboard-operated diagram areas, equivalent radio controls, required-choice errors and Back state preservation.
- Supporting-photo JPEG/PNG/WebP validation through the shared validator; invalid types and oversized images; successful camera-oriented file chooser; multiple photos, removal, annotations and written notes.
- Photos and notes retained while changing methods; no upload POSTs or localStorage writes; clear refresh recovery.
- ZIP integrity checked with `unzip -t`; exported notes/annotation coordinates and original photo entry verified.
- Assistance-to-details-to-review handoff, without falsely marking the original questionnaire as completed.
- Original homepage, camera/upload pickers, preview/replacement/removal, details schemas, measurements, review/edit/next steps, navigation, dialogs and guided markings regression tests.
- Assistance gallery overflow at 320/375/768/1280px, plus existing broader homepage/intake viewport checks.

## Screenshots

Local artifacts (not committed): `artifacts/guided-assistance/{desktop,mobile,small-mobile}-{recovery,problem-area,results,common-parts}.png`. These final captures load the local images and reset focus/scroll before capture. Widths: desktop 1280px, mobile 375px, small-mobile 320px.

## Limits

Chromium mobile emulation and browser file chooser behavior were tested. A physical Android camera, OS permission denial UI, Safari and Firefox were **not** tested. Direct camera capture depends on the browser/device; standard upload and photo-free paths remain available. AI recognition, catalog matching, verified compatibility, supplier products, checkout and a staffed help-request service are not connected.

Photos and answers live only in tab memory and clear on refresh/close. The downloadable ZIP is a user-requested local export. No deployment configuration, environment variables or dependencies changed. No merge or manual production deployment was performed.

## Routes

- `/find-part/guided`: assistance nested into the existing finder.
- `/find-part/review` and `/find-part/next-steps`: conditional assistance notes and supporting photos via the shared review component.
- `/find-part/details`: existing route consumes the selected family; its implementation is preserved.
- Existing category and measurement-guide routes remain the destinations for guidance.

## Changed files

- `docs/guided-assistance.md`
- `src/components/part-finder/assistance/assistance-flow.tsx`
- `src/components/part-finder/assistance/assistance-notes.tsx`
- `src/components/part-finder/assistance/assistance-photos.tsx`
- `src/components/part-finder/assistance/assistance.css`
- `src/components/part-finder/assistance/family-card.tsx`
- `src/components/part-finder/assistance/hardware-illustration.tsx`
- `src/components/part-finder/assistance/recovery-hub.tsx`
- `src/components/part-finder/guided-finder.tsx`
- `src/components/part-finder/intake-review.tsx`
- `src/components/part-finder/photo-provider.tsx`
- `src/components/part-finder/workflow-shell.tsx`
- `src/config/assistance.ts`
- `src/lib/assistance-export.ts`
- `src/lib/assistance.ts`
- `src/types/assistance.ts`
- `tests/assistance.spec.ts`
- `tests/intake.spec.ts`
- `docs/guided-assistance-verification.md`
