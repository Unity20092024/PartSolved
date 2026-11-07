# Video source review — 7 November 2026

The user supplied `video-research-tracker.md` and confirmed that no additional candidates had been reviewed. Only its two EXACT MATCH candidates are connected to the existing Guides catalog. PARTIAL, TITLE-ONLY and NONE FOUND entries remain unpublished. No videos were generated, downloaded or proxied.

## Evidence and limits

Official YouTube oEmbed responses returned a title, creator attribution and iframe embed markup for both candidates. The source watch pages/transcripts were also readable through the connected web fetch tool, confirming their topic scope. This is provider-issued embed metadata, not a full visual review or a guarantee of playback. Regional, account, age, site and future creator restrictions can still apply.

Direct HTTPS requests from this environment to YouTube failed at the network proxy (403). Therefore live YouTube iframe playback and player-level restrictions could not be independently exercised. No claim that full playback or every measurement demonstration was verified is made. The persistent Watch on YouTube fallback remains available. Browser tests intercept embed responses to verify click gating without contacting YouTube or downloading its media.

### Window-balance overview

- Source: https://www.youtube.com/watch?v=_RZDEwhoZ84
- Official metadata: https://www.youtube.com/oembed?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3D_RZDEwhoZ84&format=json
- Metadata title: How to Identify Window Balances | Spiral, Channel, Block & Tackle & Coil Balances
- Creator: Equiparts — https://www.youtube.com/@EquipartsNetSloan
- The supplied tracker calls the spiral-identification topic an exact match. The fetched transcript discusses balance families and identification markings. The catalog uses the actual overview title; it does not label this a complete channel-balance measurement tutorial.
- Local thumbnail is an explicitly labeled hardware illustration. Written balance measurement and fitting guides remain linked with their existing safe-access instructions.

### Hinge-type overview

- Source: https://www.youtube.com/watch?v=O9k9gzlBgj4
- Official metadata: https://www.youtube.com/oembed?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DO9k9gzlBgj4&format=json
- Metadata title: Every Type of Hinge Explained in 13 Minutes
- Creator: Workshop Unpacked — https://www.youtube.com/@WorkshopUnpacked
- The tracker calls hinge-type identification an exact match. The fetched transcript covers common hinge families. This is presented as an identification overview, not a hinge measurement tutorial or compatibility determination.
- The illustrative thumbnail uses the user's approved hinge photograph; size and orientation written guides are linked.

## Implementation

The existing `videoGuides` typed configuration now contains those two real sources, credits, local thumbnail metadata, scope descriptions and related guides. The server-rendered library displays optional descriptions and illustration captions. HybridVideoPlayer loading, no-autoplay behavior, native MP4 support and cleanup are preserved. No YouTube API key, database, upload or storage service was added. No MP4 tutorial was supplied, so none is invented; MP4 remains covered by the existing native-playback tests.

The supplied tracker is retained verbatim as research history. Its statement that the Guided Finder does not exist is outdated; the current application already includes the functional finder. Its GENERATE suggestions are research gaps, not instructions implemented by this change.

## Quality checks

Lint, TypeScript and production build passed. The updated full Chromium suite completed with **56 passed, 2 existing duplicate viewport tests skipped** in 3.4 minutes. The public Guides checks confirm both source titles, creator URLs, local lazy thumbnails, illustration labels, written-guide navigation and zero initial YouTube/ytimg/googlevideo requests on desktop and mobile. Existing native MP4 playback, click-gated embeds, fallbacks, source replacement, cleanup and finder/homepage regressions remain passing.
