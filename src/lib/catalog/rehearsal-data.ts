import "server-only";
import type { CatalogProduct, CatalogCollections, CatalogMedia } from "./model";
/** Explicit synthetic fixtures. Loaded ONLY after Preview + existing admin authorization.
 * Never a seed, supplier record, public product route or photographic representation. */
export function catalogRehearsalData() {
  const manufacturer = "e1000000-0000-4000-8000-000000000001",
    supplierA = "e1000000-0000-4000-8000-000000000002",
    supplierB = "e1000000-0000-4000-8000-000000000003",
    source = "e1000000-0000-4000-8000-000000000004",
    date = "2026-11-01T00:00:00.000Z";
  const collections: CatalogCollections = {
    manufacturers: [
      {
        id: manufacturer,
        name: "Synthetic Maker — development fixture",
        slug: "synthetic-maker",
      },
    ],
    suppliers: [
      {
        id: supplierA,
        name: "Synthetic Supplier A",
        slug: "synthetic-supplier-a",
        website_url: "",
      },
      {
        id: supplierB,
        name: "Synthetic Supplier B",
        slug: "synthetic-supplier-b",
        website_url: "",
      },
    ],
    sources: [
      {
        id: source,
        reference: "SYNTHETIC LOCAL REVIEW DATA — no supplier evidence",
        evidence_url: "",
        verified_at: date,
      },
    ],
  };
  const diagram =
    "data:image/svg+xml;charset=utf-8," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600" viewBox="0 0 900 600"><rect width="900" height="600" fill="#f7f8f5"/><text x="450" y="80" text-anchor="middle" font-family="Arial" font-size="20" fill="#a6111b">SYNTHETIC REHEARSAL DRAWING</text><rect x="190" y="210" width="520" height="140" rx="20" fill="none" stroke="#3e4545" stroke-width="8"/><circle cx="310" cy="350" r="70" fill="#fff" stroke="#3e4545" stroke-width="8"/><circle cx="590" cy="350" r="70" fill="#fff" stroke="#3e4545" stroke-width="8"/><path d="M190 160H710M190 145V175M710 145V175" fill="none" stroke="#ba111b" stroke-width="4"/><text x="450" y="520" text-anchor="middle" font-family="Arial" font-size="20" fill="#626b65">Layout illustration only · no product specification</text></svg>',
    );
  const products: CatalogProduct[] = [0, 1].map((i) => {
    const id = `e2000000-0000-4000-8000-00000000000${i + 1}`,
      variant = `e3000000-0000-4000-8000-00000000000${i + 1}`,
      verify = { source_id: source, verified_at: date };
    return {
      id,
      revision: 1,
      status: "draft",
      slug: `synthetic-rehearsal-${i + 1}`,
      title: i
        ? "Synthetic window lock — rehearsal only"
        : "Synthetic roller assembly — rehearsal only",
      description:
        "Development fixture for evaluating catalog layout and identifier relationships. This is not live inventory and cannot be ordered or published.",
      manufacturer_id: manufacturer,
      manufacturer_name: collections.manufacturers[0].name,
      family_id: i ? "window-locks" : "rollers",
      synthetic: true,
      ...verify,
      created_at: date,
      updated_at: date,
      variants: [
        {
          id: variant,
          key: "test-variant",
          finish: "Test finish A",
          color: "",
          material: "",
          handedness: "unknown",
          ...verify,
          numbers: [
            {
              id: crypto.randomUUID(),
              kind: "manufacturer",
              value: `DEMO-MPN-00${i + 1}`,
              ...verify,
            },
          ],
          offers: [
            {
              id: crypto.randomUUID(),
              supplier_id: supplierA,
              supplier_name: "Synthetic Supplier A",
              sku: `DEMO-A-00${i + 1}`,
              availability: "unknown",
              ...verify,
            },
            ...(i
              ? []
              : [
                  {
                    id: crypto.randomUUID(),
                    supplier_id: supplierB,
                    supplier_name: "Synthetic Supplier B",
                    sku: "DEMO-B-001",
                    availability: "unknown" as const,
                    ...verify,
                  },
                ]),
          ],
          dimensions: [
            {
              id: crypto.randomUUID(),
              key: "screw-spacing",
              label: "Synthetic test spacing",
              value: 25.4,
              unit: "mm",
              ...verify,
            },
          ],
          compatibility: [],
        },
      ],
      media: i
        ? []
        : [
            {
              id: crypto.randomUUID(),
              product_id: id,
              variant_id: null,
              kind: "drawing",
              path: diagram,
              alt: "Synthetic roller-family diagram for development layout review; not an actual product",
              attribution: "Original PartSolved development illustration",
              rights_reference:
                "Original synthetic test diagram; no manufacturer media",
              permission: "approved",
              state: "ready",
              width: 900,
              height: 600,
              bytes: 1000,
              ...verify,
            } satisfies CatalogMedia,
          ],
    };
  });
  return { products, collections };
}
