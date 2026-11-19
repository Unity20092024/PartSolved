# Import mapping and review

The [template](./import-template.csv) has headers only: no invented inventory. Download it from the authenticated catalog import screen as well.

1. Add/review the real manufacturer(s), supplier(s) and authorized source reference first. Their internal slugs are mapping keys.
2. Use UTF-8 CSV or XLSX, first worksheet. Bounds: 3 MiB file, 500 data rows, 40 columns, 4,000 characters per cell; workbook ZIP expansion additionally capped at 12 MiB / 150 entries / 4 MiB per entry. Sparse ranges outside the row/column bounds, XML entities, formulas, external links, macros and legacy XLS/XLSM are rejected. Convert to a values-only CSV/XLSX first.
3. In Excel, set identifier columns to **Text before entry/export**. Numeric identifier cells are rejected; lost leading zeros are never guessed back into existence.
4. Read the file, choose each source-column mapping and inspect the first five rows. Required mappings: product_slug, title, manufacturer_slug, family_id. Each row also needs an actual manufacturer number or a supplier SKU.
5. Select the provenance record for the batch and accurately label synthetic/development data. The protected rehearsal forces synthetic=true. Do not copy fixture values into a real supplier import.
6. Validate required fields, units, duplicate rows, existing slugs/numbers/SKUs and conflicting variant data. No import is allowed with row errors. No cross-reference is invented when fields are missing.
7. Review product/variant/offer counts, then explicitly import as drafts. Each batch contains up to ten whole products; variants for a product are never split between batches. A failed request can be retried with the same batch ID. Already committed batches are not inserted twice; a different canonical payload with the same ID is refused.
8. Review each saved product before publication. Imports never publish, modify existing records, infer compatibility or construct purchasing/affiliate URLs.

## Fields

- product_slug: explicit product grouping and future URL; lowercase, digits and hyphens, <=100 characters.
- title / description: product text from an approved source; title required. Rows sharing the same slug must agree on these and manufacturer/family/review date.
- manufacturer_slug: existing manufacturer record, not a supplier name guessed to be a maker.
- family_id: existing PartSolved family ID: balances, window-locks, operators, rollers, patio-locks, handles, closers, hinges, screen-latches, track-fin-locks.
- variant_key: explicit variant grouping within the product; defaults to internal key standard when omitted. Different finish/handedness variants need different keys.
- manufacturer_part_number: actual maker number. alternate_part_number: documented alternate identifier only. Neither field is copied from supplier_sku.
- supplier_slug / supplier_sku: existing supplier and its own SKU; both required when an offer is present. Repeated rows for different suppliers can share one product/variant and maker number.
- finish / color / handedness / material: only sourced attributes; blank allowed, handedness unknown/left/right/non-handed.
- measurement_key / measurement_label / measurement_value / measurement_unit: optional named measurement, positive decimal, in or mm. Repeated rows may add different measurements to the same variant; conflicting values for one key are errors. No two-measurement assumption is made.
- verified_at: optional actual evidence-review date/time (ISO or YYYY-MM-DD); blank means unverified. It is not replaced with today's date automatically. Imported availability defaults to **unknown**, not in stock.

Possible normalized collisions require manual investigation. The import does not merge with an existing product automatically, because an apparent number match is insufficient evidence that two variant records are identical.

Safe rollback is all-or-nothing for a committed batch. It refuses any created record that was edited, no longer draft, has media, was deleted/reassigned or is referenced elsewhere. It retains organizations, sources and audit history. If rollback refuses, preserve the record and review dependencies rather than force deleting it.

JSON export includes complete nested product graphs, lookups, total and next_offset. Use Export offset to download further pages; reduce limit if the authenticated export API requests a smaller page. Export does not claim a price/feed/automatic re-import service. CSV template values remain strings, and formula-like CSV export cells are escaped by the shared utility.
