# Guided Finder assistance

## Scope and entry points

This is an incremental change on `main` (base `158dc095`) in `Unity20092024/PartSolved`. The original five-question finder, choices, primary photo picker, details form, category routes, homepage and deployment configuration are preserved. No new dependencies, services or environment variables are required.

`/find-part/guided` now contains a nested assistance flow. Customers can enter from “Need a simpler way?”, from an unknown/Other answer, or from the recovery hub shown when the original questionnaire cannot narrow down a category. Returning to the original questions keeps their answers. The existing homepage Guided Finder link continues to use this route.

## Customer journey

1. Choose photo assistance, a visual location, everyday symptoms, or common part examples. No measurements or photo are required.
2. The visual finder asks for window/door type, then offers numbered SVG areas and equivalent native radio choices. These are original, simplified location illustrations, not repair or exact-model diagrams.
3. Symptoms adapt to window/door type. A sliding patio door that is hard to slide gets a follow-up asking where it catches. Unknown/Other choices remain available; changing location clears dependent area/symptom/follow-up answers so stale answers are not applied to the new location. Written descriptions and explicit family selections remain available.
4. Photo assistance accepts up to four supporting JPEG/PNG/WebP images, up to 10 MiB each, using existing validation and image decoding. Capture falls back to the browser file picker where necessary. Users can tag photo purpose, add a note, mark a point with touch/mouse or Enter/arrow keys, clear the mark, and remove an image. Their separate primary photo remains intact. A replacement supporting image can be added after removing the old one.
5. Common-part cards show the four already approved local family photographs plus original labeled SVG schematics for families without approved photographs. None represent exact replacements. “This Looks Similar” and “Not This One” record the customer's judgment and can be changed.
6. Assisted results show at most three possible families, evidence-specific reasons, checks and existing measurement-guide links. All-unknown or photo-only answers produce no invented diagnosis, and instead offer concrete ways to add information or keep a local summary. Rejected families are excluded from suggestions.
7. “That Looks Like My Part” transfers the chosen family to the existing `/find-part/details` form. Ambiguous balances/handles/hinges retain an unspecified or Other detailed type. Existing manufacturer, measurements and problem notes are preserved. The customer can proceed to `/find-part/review` and `/find-part/next-steps`, which also expose assistance notes and supporting photos when present.
8. A final recovery section allows another photo, free description, common examples, measurement help and a copy/download of the local summary. ZIP export includes plain-text notes, original photos and normalized annotation coordinates in the notes. No request is submitted; no staffed support response is promised.

## Architecture and extension points

- `src/types/assistance.ts`: memory-only state and family/suggestion types.
- `src/config/assistance.ts`: locations, adaptive choices, family descriptions, existing guide targets and approved image references.
- `src/lib/assistance.ts`: deterministic, independently tested triage rules and non-destructive handoff to the existing intake draft. Extend rules here; do not add compatibility claims without verified manufacturer/catalog evidence.
- `src/lib/assistance-export.ts`: readable summary and a dependency-free ZIP STORE encoder. Export runs locally only after the user requests it.
- `src/components/part-finder/assistance/`: recovery hub, flow coordinator, reusable family cards, original illustrations, photo/annotation controls, scoped styles and conditional review notes.
- `PhotoProvider`: extends the existing in-memory state with assistance answers and supporting File objects.
- `WorkflowShell`: optional callback for nested Back navigation; existing route-based Back links remain unchanged.
- `tests/assistance.spec.ts`: rule and browser coverage. One existing unknown-result assertion in `tests/intake.spec.ts` now expects the new recovery heading.

The rules are intake triage, not a matching engine. For example, a window that will not stay open suggests checking balances; patio sliding difficulty suggests checking rollers and track conditions; a patio lock problem can suggest both the lock and handle/linkage. Location alone and photos alone do not constitute evidence for a specific family. Explicit visual selections are labeled as the customer's observation. No percentages, supplier products, price, inventory or compatibility claims are produced.

## Privacy, lifecycle and limitations

All original and assistance answers and File objects stay in the existing root React provider, in tab memory. No image bytes, answers or annotations enter localStorage, analytics or a remote API. Blob URLs are revoked when previews unmount/change; validation URLs are revoked after decoding; download URLs are revoked after use. Changing methods or routes does not clear progress. Refresh/tab closure clears progress, with recovery guidance on the initial finder and a privacy explanation throughout the workflow. Downloaded notes/photos remain wherever the customer saves them.

“Restart Assistance” is a disclosed action under Start Over: it clears only assistance answers and supporting photos. Original Guided Finder answers, primary photo and Add Details information remain. Customers can clear existing primary photos with the existing controls.

Actual camera hardware/permissions depend on the device/browser. Automated Chromium tests can exercise file-input capture attributes and file chooser events, but cannot verify a physical Android camera. AI recognition, automated catalog matching, compatibility verification, supplier integration, checkout and a staffed identification-request backend are unavailable. Nothing is submitted by this feature.

## Run and verify

```sh
npm ci
npm run lint
npm run typecheck
npm run build
npm run start
# In another terminal (or let Playwright start the production server):
npm run test:e2e -- --workers=1
```

This environment uses `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium`; otherwise install a Playwright-supported Chromium browser. The archive integrity test uses the standard `unzip` utility. Screenshots are generated under ignored `artifacts/guided-assistance/`, and test traces/downloads under ignored `test-results/`.

No production deployment is required to review locally. A pushed PR can receive the project's existing automatic Vercel preview; this change does not modify that integration, merge branches or manually trigger production deployment.
