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

## Window measurement thumbnail

- Local asset: `window-sash-measurement.webp` (replaces the generic screw-and-ruler thumbnail).
- Source: [Crop worker measuring window frame with ruler](https://www.pexels.com/photo/crop-worker-measuring-window-frame-with-ruler-5691534/), photo ID **5691534**.
- Photographer: **Ksenia Chernaya**. Published 25 October 2020; captured 20 October 2020 with a Nikon D750, according to the source page.
- Rights: [Pexels License](https://www.pexels.com/license/). The license permits free website/app and commercial use and modifications; attribution is not required. The photograph is used as an illustrative measurement example, without endorsement claims or standalone resale. Source and license verified on 6 November 2026.
- Download: `https://images.pexels.com/photos/5691534/pexels-photo-5691534.jpeg?auto=compress&cs=tinysrgb&w=1600` (downloaded and hosted locally, never hotlinked at runtime).
- Processing: deterministic crop `(620, 330, 960, 520)` from the downloaded 1600×1068 image, then WebP quality 90. This centers the actual window sash edge, hand, and ruler. CSS favors the right-hand measurement area on narrow thumbnails. No generated content, reconstructed components, or altered measurement markings.
- The image demonstrates measuring a real wooden window sash. The guide link and current video-library availability remain unchanged.

## Remaining image slot

The hero remains a labeled temporary slot: a wide residential window/door scene with a real handle on the right and space for text on the left. An approved image with confirmed commercial usage rights can be configured in `src/config/photography.ts`. Keep source and rights records here when adding or replacing images.
