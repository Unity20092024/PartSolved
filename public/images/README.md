# Homepage image provenance

All images are hosted locally and served through Next.js Image. No supplier catalog images were scraped or hotlinked, and no imagery was generated for this change.

## User-supplied category assets

The user supplied these four local attachments with the explicit instruction to replace the corresponding homepage placeholders. That instruction is the usage authorization for these supplied assets; no separate manufacturer ownership or third-party license is asserted. Original authorship and photographic provenance were not independently established. These files are category illustrations only, not product listings or representations of inventory.

| Local WebP                       | Supplied attachment | Subject                     | Crop (left, top, width, height) |
| -------------------------------- | ------------------- | --------------------------- | ------------------------------- |
| `window-sash-lock.webp`          | `1000016554.jpg`    | Window sash lock and keeper | 70, 75, 1135, 565               |
| `residential-door-lockset.webp`  | `1000016555.jpg`    | Residential lever lockset   | 75, 55, 1150, 575               |
| `window-balance-assembly.webp`   | `1000016556.jpg`    | Window balance springs      | 60, 65, 1160, 510               |
| `sliding-patio-door-roller.webp` | `1000016557.jpg`    | Tandem patio door roller    | 80, 65, 1120, 510               |

Processing: deterministic rectangular crops exclude embedded titles, subtitles, buttons, and card borders, followed by WebP encoding at quality 90. No hardware components were generated, retouched, or reconstructed. The original lockset artwork has keys overlapping its embedded caption, so their lower ends fall outside the usable photograph crop. Product images use `object-fit: contain` inside the existing fixed-height image areas to preserve the visible mechanical components across viewport sizes.

## Hardware measurement thumbnail

- Local asset: `hardware-measurement.webp`.
- Source: [M3 screw and 6-32 UTS screw with ruler thread pitch.png](https://commons.wikimedia.org/wiki/File:M3_screw_and_6-32_UTS_screw_with_ruler_thread_pitch.png).
- Original photographer: **Diluvial**, 6 July 2008. The Commons revision used includes a color adjustment by **Hohum**, 2 February 2024.
- Rights: **Public domain (PD-self)**. The file page states: “I, the copyright holder of this work, release this work into the public domain. This applies worldwide.” It additionally grants use for any purpose without conditions where that release is not legally possible. The Commons API reports `License: pd`, `Copyrighted: False`, and `AttributionRequired: false`. Verified on 6 November 2026.
- Download: `https://upload.wikimedia.org/wikipedia/commons/6/6f/M3_screw_and_6-32_UTS_screw_with_ruler_thread_pitch.png` (local copy, no runtime hotlink).
- Processing: crop `(30, 355, 774, 365)` shows the screw and ruler measurement; WebP quality 90. No generated content or altered measurements.
- The picture demonstrates measuring small hardware; it is not presented as window-specific instruction or an operational video.

## Remaining image slot

The hero remains a labeled temporary slot: a wide residential window/door scene with a real handle on the right and space for text on the left. An approved image with confirmed commercial usage rights can be configured in `src/config/photography.ts`. Keep source and rights records here when adding or replacing images.
