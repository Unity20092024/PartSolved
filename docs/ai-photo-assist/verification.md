# AI Photo Assist Stage 1 — verification

Date: 2026-11-09. Branch: `feat/ai-photo-assist-stage-1`, based on repository main `ad48012b8339ea2e42723a3600d0e7c33c90bc54`.

## Checks

| Check | Result |
| --- | --- |
| Dependency installation | Passed; pinned Sharp runtime dependency, pg/types dev-only, npm lockfile updated |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| `npm run build -- --webpack` | Passed; full production compilation and static/dynamic route generation |
| Default `npm run build` / Turbopack | Blocked by this environment's worker process/port restriction, also observed before this feature. The project's build script and deployment configuration were not changed to work around it |
| `npm run test:ai` with dedicated local PostgreSQL 17 `ai_test` | 9 checks passed, none skipped |
| Complete Playwright suite | 68 passed, 2 existing duplicate viewport loops intentionally skipped (6.1 minutes) |
| Focused AI Playwright checks | 10 passed, desktop and mobile Chromium |
| `npm run test:ai:reviewer` | Passed against actual local Next server and HTTPS accounting fixture backed by PostgreSQL; no OpenAI key in the child server |
| `npm run eval:ai` | 12 file checksums/manifest records validated; **0 model requests**, not an accuracy evaluation |
| `git diff --check` | Passed |

The PostgreSQL checks run the actual candidate SQL and service-role/anonymous/authenticated permissions. They exercise parallel reservations, caps that cannot be raised above $1/day and $10/month, repeated IDs, per-session limits, rate slots, UTC boundaries, unresolved reservations carried over old periods, idempotent settlement, monitoring totals, and automatic disable on a pricing/token overrun. Database failures retain reservations or block analysis; there is no in-memory allowance fallback.

The server checks also cover strict family validation, invalid photo references, extra response fields, prohibited SKU/compatibility/price/dimension claims, Unknown outcomes, preservation of manually entered fields/measurements, cost upper bounds, floating/unknown model aliases, JPEG/PNG/WebP decoding and metadata stripping, corrupt/mislabeled/oversized files, reviewer expiry/tampering, production refusal, cross-site/Host rejection, canonical reviewer redirects, consent, provider failure and missing accounting.

Chromium coverage includes the original homepage, camera/file pickers, preview/replace/remove, original Guided Finder and Not Sure assistance, all ten photographs, Details measurements, Review/next-step guidance, measurement guides, and the hybrid video player. New tests cover consent before any analysis call, three-photo selection, analysis-number labels for out-of-order selections, customer confirmation/rejection, manual answer retention, navigation, Unknown/error handling, late responses, refresh recovery, AI-only-photo handoff into existing intake and skipping AI without an empty-photo dead end.

## Real-app integration and screenshots

The reviewer integration check uses the actual Next application on local port 3001, native browser form login, real signed HttpOnly cookies and server-side authorization. A loopback-only HTTPS fixture maps the application's accounting RPCs to the dedicated local PostgreSQL database using the service role. A generated local certificate is trusted by the child process; TLS verification is not disabled. OpenAI credentials are explicitly removed, so it checks honest missing-credential recovery without a model call.

This caught and verified fixes for Next.js internal-hostname normalization: Origin checks use the configured browser origin and actual Host header, and redirects use that same trusted origin. It checks both private page rendering and usage/session controls, then logout. Temporary test files/certificates are ignored by Git.

Local screenshots (not a deployment, not model-accuracy evidence):

- `artifacts/ai-photo-assist-review-mobile.png` — actual application, 375px, supplied operator photo selected, consent pending.
- `artifacts/ai-photo-assist-review-desktop.png` — actual application, 1280px.
- `artifacts/ai-photo-assist-375.png` and `artifacts/ai-photo-assist-1280.png` — isolated UI harness with development fixtures.

The AI UI overflow loop covers 320, 375, 390, 430, 768 and 1280px; the existing regression suite covers its original wider viewport set. Keyboard activation, accessible validation and labels are exercised. Physical Android camera capture, Safari and Firefox are not claimed as tested.

## Evaluation and remaining external setup

Six supplied gallery examples have provisional visual family labels; four have ambiguous mechanical/application details requiring expert review; two existing color fixtures serve as non-hardware controls. These are a **small development smoke collection**, not manufacturer-verified ground truth or a representative real-world holdout. No production accuracy percentage is supported. No customer photos were collected, permanently stored or used as training data.

The connected repository still has no blog implementation branch, and the connected Supabase account exposes no PartSolved project. No unrelated project was modified. Reuse the blog's database once accessible; do not create another one. Candidate migration history must be reconciled with that work before applying anything hosted.

Provide configuration securely using environment settings, not chat or committed files: the OpenAI project API key, shared blog Supabase URL/server secret, independent reviewer/session/IP-hash secrets, exact review origin and private-review flags. See `.env.example` and the feature README for variable names and the pinned model. The database gate defaults disabled. No hosted schema/grant configuration, actual OpenAI request, provider-cost reconciliation or hosted database integration has been tested without those credentials.

Before public release, expand independent real photographs (all families, unclear/unrelated inputs and prompt injection), obtain expert labels, run the actual model, review errors and costs, verify hosted privacy/security/accounting, and perform device checks. The production gate remains blocked in code; passing mocked/local tests does not approve public release.

## Delivery boundaries

No paid infrastructure, second database, Git push, remote PR, merge, deployment, production setting or environment variable was created/changed. GitHub PR text is prepared in `pull-request.md`. The branch stays local because the existing Vercel Git integration can create a deployment on push, and deployment needs the user's approval. Supplier matching, exact replacement/compatibility, inventory, prices and checkout remain outside this implementation.
