# Add privately gated AI hardware-family photo assistance

Customers currently cannot request photo-based hardware-family assistance inside the existing Guided Finder. This adds an explicit consent-based Analyze Photo action, one initial photo plus up to two optional views, strict server-validated family suggestions, observable evidence, uncertain markings, provisional measurement guidance and Unknown recovery. Customers confirm before category/type changes; manual details and measurement groups are retained. No supplier products, compatibility claims, prices or checkout are added.

Access defaults off and Vercel production always refuses it. Private reviewer sessions provide development access and usage monitoring. No infrastructure has been provisioned and the shared Supabase accounting migration remains unapplied to hosted projects.

## Implementation

- New server-only analysis, access, image normalization, policy, response-validation and ledger modules; native OpenAI Responses API, pinned `gpt-5.4-mini-2026-03-17`, no tools or automatic retries.
- New reviewer-only Photo Assist/results components within existing Guided Finder, assistance and preview pages; memory-only state, no photo persistence.
- Shared privacy notices distinguish explicitly requested AI assistance from unavailable catalog matching. Existing public/default behavior and camera/upload paths are preserved.
- Shared-database SQL with private RLS tables and service-only SECURITY INVOKER RPCs; atomic reservations enforce $1/day and $10/month, including uncertainty carried over UTC boundaries. $0.03/call reserved against a reviewed maximum of $0.020322 plus margin. Overruns disable the gate.
- Development photo manifest and opt-in evaluator; Node, PostgreSQL, Chromium and real-app reviewer integration tests. Only Sharp becomes a direct runtime dependency; pg/types are development-only.

## Verification

See [verification.md](verification.md) for commands, results and limitations. Screenshots are local artifacts from the real application with no OpenAI credential; they do not demonstrate recognition accuracy.

## Setup and release restrictions

Required variable names only: `OPENAI_API_KEY`, `OPENAI_VISION_MODEL`, `AI_ANALYSIS_ENABLED`, `AI_LOCAL_REVIEW` (local only), `AI_ALLOWED_ORIGIN`, `AI_REVIEW_ACCESS_TOKEN`, `AI_SESSION_SECRET`, `AI_IP_HASH_SECRET`, `SUPABASE_URL` (or existing `NEXT_PUBLIC_SUPABASE_URL`), `SUPABASE_SECRET_KEY`.

Reuse the blog's Supabase project and migration history. Audit that history and grants before adopting the candidate migration. Database controls default disabled. Do not run production migrations, merge, deploy, enable public access, or provision another database without approval. Reviewer authentication is temporary development access, not a second customer authentication system; integrate the blog's administrator authorization when it exists.

Live OpenAI/Supabase integration and meaningful recognition evaluation remain blocked on credentials/project setup. The small collection contains provisional visual labels, not verified manufacturer truth or production accuracy evidence. Expand independent, expert-labeled, permission-cleared photographs and complete privacy/security/spending checks before a separate public-release review. Physical Android camera verification remains manual.
