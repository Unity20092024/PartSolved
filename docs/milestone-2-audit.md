# Milestone 2 audit and implementation record

## Starting point (6 November 2026)

- Repository: `Unity20092024/PartSolved`; clean working tree at the start.
- `main` was `9695090` (foundation and category/tutorial image work merged).
- Pending hero PR #3 was `958f214` on `feat/hero-hardware-photograph`. Milestone 2 starts from that branch to preserve the completed hero photography. The PR base is checked again before delivery.
- Stack retained: Next.js 16.4.5 App Router, React/React DOM 19.3.1, strict TypeScript, Tailwind 4.3.4, Lucide React 1.69.0, npm, ESLint 9 with the matching Next.js config, and Playwright. No new runtime dependencies or services.
- Existing routes: homepage, windows/doors landing pages, four category routes, details scaffold, guided scaffold, guides scaffold, support, and not-found handling.
- Root `PhotoProvider` held one `File` in React state. Preview and decoding used revocable blob URLs; no photo persistence or uploads. There was no shared details form or answer state.
- Existing camera/upload buttons called two separate native file inputs. Camera used `capture="environment"`; standard upload did not request a camera.

## Baseline verification

- `npm ci`: completed from the existing lockfile.
- Unmodified production build: passed.
- Existing Chromium suite: **13 passed, 1 skipped** (a duplicate viewport sweep in the mobile project).
- Camera and upload both opened native pickers in desktop and mobile Chromium. Selection, preview, replacement, removal, and route handoff worked.
- The reported unresponsive controls were **not reproduced as an application defect**. Native picker/camera access can be unavailable in embedded/automated browsers. Actual camera permission and capture remain device-dependent; no physical Android device was tested.
- The decorative arrow's bounding rectangle intersected the primary button region at 1024, 1100, and 1280px. It already had `pointer-events: none`, so it did not intercept clicks. Milestone 2 reduces its display box to remain in the existing gap and tests separation from controls/headline.
- Details, guided identification, and education were deliberately unfinished scaffolds. Their missing behavior was not a photo-picker defect.
- Existing MIME validation accepted browser-decodable formats beyond the requested JPEG/PNG/WebP set. Milestone 2 explicitly restricts supported types while keeping `accept="image/*"` for camera/picker interoperability.

## Deployment comparison

The connected Vercel project is `partsolved`. GitHub reports a completed Vercel deployment for production-branch commit `9695090` and a ready hero preview for `958f214`. Those commits differ: the pending preview has the hero photograph while the starting production branch retained its hero placeholder.

The Vercel API returned **403 team authorization required** for deployment history and project domains. A single-use authorization link was presented; no authorization is assumed. Therefore production/preview aliases and live browser equivalence were not established by that API audit. The code/commit comparison above is distinguished from a live production test. No deployment, promotion, configuration change, or production mutation is part of this milestone.

## Implementation approach

1. Preserve the existing root photo context, browser file-input mechanism, preview renderer, approved images, homepage, and category URL slugs.
2. Extend the root context with memory-only intake and guided answers. Keep category-specific selections and part-type-specific measurements so changing selections does not overwrite prior entries. Refresh/tab close intentionally clears all workflow data.
3. Share picker/validation behavior across homepage, preview, and details. Handle native cancellation without erasing the current selection. Disable continuation during decoding. Keep native browser fallbacks and give upload guidance when camera access is unavailable.
4. Add preview, editable details, review, and useful next-step routes. Required choices accept Not Sure; measurements and extra details are optional. Reject invalid supplied measurements, preserve explicit unknowns, and convert valid unit changes without silently relabeling values.
5. Implement five guided steps using text descriptions of the ten supported hardware families. Keep choices editable and narrow only a possible category; never produce supplier matches or compatibility results.
6. Add eight measurement-help sections with accessible, conceptual SVG diagrams and practical safety/reference-point guidance. All measurement prompts are provisional, pending manufacturer verification.
7. Define future catalog/import, matching, measurement, and affiliate-link interfaces without fixtures shown as products, adapters, API endpoints, or live supplier data.

## Working versus unavailable

Working: native picker wiring, JPEG/PNG/WebP validation (10 MiB), local preview, replacement/removal, navigation within the tab, dynamic details and measurement forms, fractions/units/unknowns, guided answers, editable review, next actions, and measurement guides.

Unavailable: server photo submission, cross-refresh persistence, AI recognition, supplier/catalog matching, verified compatibility, inventory, prices, affiliate ordering, checkout, accounts, and video guides. The UI states these limits without a fake scanning or results sequence.

## Verification scope

Automated checks cover the photo journey, supported/rejected formats, size errors, cancellation, required choices, dynamic types and fields, unit conversion, unknowns, preserved values across edits/back navigation, guided completion and insufficient-information paths, review/edit/next-step behavior, recovery, local-only data, keyboard focus, and requested viewport widths.

See the pull request and `docs/milestone-2-verification.md` for final results and screenshots. Physical Android camera capture, real device permission behavior, Safari, Firefox, and any deployment blocked by authentication require separate verification.

## Editing and accessibility checks

A regression check reproduced stale markings when Guided Finder answers were revised after their first handoff. The draft now tracks the last automatically copied marking: guided revisions update that value, while a later manual correction remains untouched. Both observations can be reviewed without silent overwrites. Inactive guided notes/markings are excluded from the normalized future matching request but retained in the in-tab editor.

Progress indicators use actual completion state. A guided journey without a photograph marks the photo as optional and not added, rather than displaying a completed-photo checkmark. Error summaries receive focus, native inputs remain keyboard accessible, and contextual edit links target the relevant form sections.
