# PartSolved™ — The Part Finder

Window and door replacement-hardware identification intake, built incrementally on the original PartSolved application.

## Run locally

Use Node.js 22 or later (verified with Node 24) and npm:

```sh
npm ci
npm run dev
```

Open http://localhost:3000. Production preview:

```sh
npm run build
npm start
```

No environment variables, database, authentication, or paid services are needed. Existing Vercel Git integration is retained; do not deploy production or merge automatically.

## Checks

```sh
npm run lint
npm run typecheck
npm run build
npx playwright install chromium
npm run test:e2e
```

Build before browser tests. To use an existing system browser, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to its absolute path. Tests use desktop and mobile Chromium projects. Screenshots/traces are written to ignored `test-results/`; curated workflow screenshots may be copied to ignored `artifacts/milestone-2/` for review.

ESLint 9 remains because the installed Next.js React/import/accessibility plugins do not declare ESLint 10 compatibility. Package versions and lockfile are preserved.

## Customer journey

1. From the homepage, take or upload a JPEG, PNG, or WebP image (maximum 10 MiB). Mobile camera capture depends on browser support; a separate upload input never requests camera access.
2. Review the selected image, replace/retake it, or remove it. Continue to the dedicated photo-preview route, then Add Details.
3. Select a category and a part type, or Not Sure. The form shows relevant provisional measurements, units, unknown choices, markings, and optional problem/finish/brand/orientation details.
4. Review and edit every section. Missing and unknown information is visible and does not fabricate a match.
5. Continue to useful next actions: improve details, read contextual measurement guidance, browse a category, or use Guided Finder.

Guided Finder can also start without a photo. Its five steps ask about location, function, appearance, measurements/markings, and review. It suggests only a possible category and transfers those choices to an editable intake. Insufficient information leads to guidance, not fake results.

## Routes

| Route                                                                                                            | Purpose                                                                                               |
| ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `/`                                                                                                              | Existing photographic homepage and camera/upload entry                                                |
| `/find-part/preview`                                                                                             | Dedicated preview, retake/replace/remove, and recovery                                                |
| `/find-part/details`                                                                                             | Dynamic editable identification form                                                                  |
| `/find-part/guided`                                                                                              | Five-step guided questionnaire and answer review                                                      |
| `/find-part/review`                                                                                              | Photo, category, measurements, markings, notes, missing information, and edits                        |
| `/find-part/next-steps`                                                                                          | Useful guidance/category/finder actions with an explicit matching-unavailable notice                  |
| `/guides`                                                                                                        | Identification-guide hub                                                                              |
| `/guides/measurements`                                                                                           | Screw spacing, overall sizes, rollers, housings, balances, end fittings, backsets, and orientation    |
| `/windows`, `/doors`                                                                                             | Existing category landing pages                                                                       |
| `/categories/window-hardware`, `/categories/door-hardware`, `/categories/window-parts`, `/categories/door-parts` | Existing stable category routes; honest catalog-unavailable states with working intake/finder actions |
| `/support`                                                                                                       | Camera/browser fallback help, privacy, progress, guides, and future supplier support explanation      |

Search, favorites, and account retain their honest initial dialog states. Catalog search and accounts are not connected. The education thumbnail now links to written guidance without implying an available video library.

## State and privacy

`PhotoProvider` remains the root shared React context. It now holds one `File`, the current details draft, and guided answers in memory. There is no localStorage, sessionStorage, cookie, IndexedDB, analytics, or server persistence for intake data. Client-side backward/forward navigation and links within the application retain state. Refreshing, closing the tab, or loading another tab resets photos and answers and displays a recovery message.

Blob URLs are allocated only for decoding/preview and revoked afterward or when previews unmount/change. A canceled or rejected replacement keeps the current photo and answers. Validation uses request generations so stale async decoding cannot overwrite a newer selection. Continuation is blocked while photo decoding is pending.

No photograph is sent to a server or external AI service. No matching request is submitted by the review or next-step pages.

## Measurement and integration architecture

- `src/config/part-types.ts`: ten supported hardware families, category mapping, descriptions, orientation applicability, and distinct measurement prompts. These prompts are explicitly **provisional**, not manufacturer specifications or compatibility rules.
- `src/config/guided.ts`: context-sensitive questionnaire choices and possible category narrowing, with Other/Not Sure and no product records.
- `src/lib/intake.ts`: positive decimal/fraction validation, unit conversion, and normalization into a typed future `IdentificationIntake` boundary. Inches accept fractions; millimeters accept decimals. Blank and explicitly unknown are distinct. Unit changes convert values and may round; verify against the original measurement.
- `src/types/catalog.ts`: future product-import, measurement, candidate-match, matching-provider, and affiliate-link contracts only. No provider, fixtures shown as products, supplier API, or checkout adapter is implemented.
- Existing component boundaries remain: layout, homepage, UI, and part-finder features. New routes reuse existing red/charcoal/white tokens and native accessible controls.

Category-specific part selections and measurement groups keyed by part type remain in memory when selections change. Returning to the previous category/type restores its inputs. Generic notes are available after choosing a type, Other, or Not Sure; unsupported/invalid values cannot masquerade as verified measurements.

## Photography and design

All six existing homepage photographs remain locally hosted. Category artwork was supplied by the user; the guide photo depicts a real window sash being measured, and the hero photo depicts real residential door hardware. See [image provenance](public/images/README.md) for sources, usage authorization, licenses, and deterministic crop/composition details. No new product photography is generated or scraped.

The logo, colors, navigation, photography, and homepage layout are retained. The separate subtitle uses the approved “The Part Finder” tagline. Add Details and Guided Finder follow the supplied mockups' rounded white cards, red selections/actions, bold labels, photo presentation, and numbered progress while adapting to narrow screens.

## Limits and verification records

The public release has no AI recognition, live catalog, supplier integration, price/stock data, compatibility verification, checkout, authentication, or database connection. There are no simulated scanning or fabricated result screens. State intentionally does not survive refresh. The private AI Photo Assist foundation below does not enable public recognition.

The existing baseline picker behavior was reproduced successfully in Chromium; physical Android camera capture and Safari/Firefox still need device/browser verification. Deployment/API access limitations are recorded separately from local test results.

- [Audit and implementation record](docs/milestone-2-audit.md)
- [Final verification report](docs/milestone-2-verification.md)

## Private AI Photo Assist — Stage 1

The feature branch adds optional, consent-based hardware-family assistance to the existing Guided Finder and photo preview. It is disabled by default and blocked in Vercel production. It needs an OpenAI credential and the **same Supabase database as the blog** before live private review; no hosted database or migration has been provisioned/applied by this implementation.

Server-side image validation, pinned-model structured responses, customer confirmation, local state preservation and atomic $1/day / $10/month accounting are implemented. The reserved maximum is $0.03/call; uncertain calls stay reserved across UTC period boundaries. This is not exact replacement matching and has no Strybuc catalog connection.

See [setup, privacy, pricing and release gates](docs/ai-photo-assist/README.md), [verification](docs/ai-photo-assist/verification.md), and [.env.example](.env.example). Additional checks are `npm run test:ai`, `npm run test:ai:reviewer` (dedicated local test database required), and `npm run eval:ai` (manifest validation only; no API calls by default).
