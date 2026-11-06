# Milestone 2 verification

## Implemented flow

Homepage camera/upload → local preview → `/find-part/preview` → `/find-part/details` → `/find-part/review` → `/find-part/next-steps` → useful measurement, category, or guided identification actions.

Guided Finder also works without a photograph: location → function → descriptive hardware family → measurements/markings → answer review → editable details → intake review. Its output is a possible category, not a product match.

## Results

| Check | Result |
| --- | --- |
| Existing lockfile install (`npm ci`) | Passed |
| ESLint (`npm run lint`) | Passed, no warnings |
| Strict TypeScript (`npm run typecheck`) | Passed |
| Production build (`npm run build`) | Passed; all existing and new routes generated |
| Existing unmodified baseline | 13 passed, 1 duplicate viewport test skipped |
| Milestone 2 desktop Chromium cases | All 18 active cases verified |
| Milestone 2 mobile Chromium cases | All 16 active cases verified; 2 duplicate viewport sweeps skipped |
| Final active-case total | **34 passed; 2 intentional skips; no unresolved failures** |
| Screenshot/browser walkthrough | Passed on 1280px desktop and 390px mobile; 16 captures generated |
| Browser Back/Forward in the active workflow | Photo, selected type, and entered measurements retained in both screenshot walkthroughs |
| Runtime and photo submission checks | No browser runtime errors, horizontal overflow, or photo POST requests during the final walkthrough |
| Whitespace checks (`git diff --check`) | Passed |

Commands used for the final application regression checks:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:e2e -- --workers=1
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:e2e -- --workers=1 --last-failed
```

The final full application run verified 32 cases and exposed two **test selector** failures: the progress link's accessible name includes its step number before “Photo optional, not added.” The assertion was corrected to include that accessible-name context, and both desktop and mobile cases passed in the last-failed rerun. The total above combines that full run and the successful rerun; it does not claim that every development attempt passed.

Earlier test runs also caught and resolved a new-workflow bug in guided-marking revision: an automatically copied marking originally stayed stale after editing the guided answer. A regression test now verifies that guided revisions update their copied values while keeping a later manual correction. Initial broad selectors were scoped to their actual radio groups/dialogs. A serial browser worker and a 60-second overall case budget avoid shared-runtime browser-startup contention; assertions still wait for actual UI states, with no forced sleeps or blanket retries.

## Coverage

- Valid PNG, JPEG, and WebP selection/decoding; unsupported, SVG, empty, oversized, and damaged files.
- Native camera/upload picker wiring, capture preference, cancellation, replacement, removal, and validation errors that preserve an existing photo.
- Preview and Continue to Add Details, including refresh/recovery behavior.
- Required category/type choices, Other/Not Sure, context-specific options, and all ten provisional part-type measurement configurations.
- Positive decimals, imperial fractions, invalid/zero-denominator values, inches/millimeters conversion, unknown versus missing measurements, and normalization of a future matching request.
- State retention across category/type changes, back navigation, contextual guides, review edits, and guided-question edits.
- Guided completion, no-photo entry, no-candidate/insufficient-information paths, correct optional-photo progress, and guided-to-details marking provenance.
- Review summary, missing information, editable sections, next-step guidance links, and honest matching-unavailable status.
- Keyboard selection, visible focus, error-summary focus, native dialog Escape/focus restoration, and semantic progress/diagram labels.
- Homepage and workflow overflow at **320, 375, 390, 430, 768, 1024, and 1280px**; additional existing homepage checks at 540 and 699px.
- Decorative arrow separation from headline and primary photo controls.
- Local-only behavior: no intake data written to localStorage/sessionStorage, no photo POST requests, and source inspection confirms no upload/matching API or analytics calls.

## Screenshots

Curated captures are available in the local workspace at `artifacts/milestone-2/`, with `desktop-` and `mobile-` variants:

- `preview.png`
- `details.png`
- `review.png`
- `next-steps.png`
- `measurements.png`
- `guided.png`
- `guided-review.png`
- `guided-details.png`

A local `screenshots.zip` bundles the captures. These artifacts are intentionally ignored by Git; screenshot links are provided in the delivery response rather than claiming they are hosted by GitHub. The images use approved sash-lock artwork as a selected-photo development fixture. Demonstration entries are explicitly labeled as test information, not verified manufacturer dimensions or supplier data.

## Limitations and manual checks

- **Not performed:** physical Android camera capture or permission prompts on actual hardware, Safari, and Firefox. Chromium mobile emulation verifies picker wiring, interaction, and layout; it does not prove device camera access.
- **Blocked by authorization:** Vercel deployment history/domain inspection returned 403 for the project team. GitHub commit/deployment-status evidence establishes differing production-branch and hero-preview commits at the audit start, but live production/preview browser equivalence could not be confirmed through that Vercel API access.
- **Intentionally unavailable:** cross-refresh persistence, server photo submission, AI recognition, supplier catalog matching, verified compatibility, prices/stock, affiliate checkout, accounts, and video guides.
- Measurement prompts remain provisional and need manufacturer-documentation verification before a real catalog/matching integration.
- No merge or manual production deployment is performed for this milestone. Existing Git integration may create a feature-branch preview automatically after push.
