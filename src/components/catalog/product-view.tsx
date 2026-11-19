"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  catalogFamilies,
  type CatalogProduct,
  type CatalogSource,
  type CatalogMedia,
} from "@/lib/catalog/model";
function Gallery({ media }: { media: CatalogMedia[] }) {
  const [selected, setSelected] = useState("");
  const visible = media.filter(
    (m) =>
      m.permission === "approved" &&
      m.state === "ready" &&
      m.verified_at &&
      m.source_id,
  );
  const active = visible.find((m) => m.id === selected) || visible[0];
  const src = (m: CatalogMedia) =>
    /^(data:|blob:)/.test(m.path) ? m.path : `/api/catalog/media/${m.id}`;
  return (
    <div className="catalog-gallery">
      {active ? (
        <>
          <figure>
            <Image
              src={src(active)}
              width={active.width}
              height={active.height}
              alt={active.alt}
              unoptimized
            />
            <figcaption>
              {active.kind === "drawing"
                ? "Technical drawing"
                : "Product photograph"}
              {active.attribution && ` · ${active.attribution}`}
            </figcaption>
          </figure>
          <div
            className="catalog-thumbnails"
            role="group"
            aria-label="Choose product image"
          >
            {visible.map((m, i) => (
              <button
                key={m.id}
                type="button"
                aria-pressed={m.id === active.id}
                aria-label={`View ${m.kind} ${i + 1}: ${m.alt}`}
                onClick={() => setSelected(m.id)}
              >
                <Image
                  src={src(m)}
                  width={110}
                  height={90}
                  alt=""
                  unoptimized
                />
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="catalog-no-image catalog-gallery-empty">
          <strong>No authorized product image</strong>
          <p>
            Images and drawings appear after their permissions and source are
            reviewed.
          </p>
        </div>
      )}
    </div>
  );
}
export function ProductView({
  product,
  sources,
  initialVariant = "",
}: {
  product: CatalogProduct;
  sources: CatalogSource[];
  initialVariant?: string;
}) {
  const [selected, setSelected] = useState(
    initialVariant || product.variants[0]?.id || "",
  );
  const variant =
    product.variants.find((v) => v.id === selected) || product.variants[0];
  const source = (id: string | null) => sources.find((s) => s.id === id);
  const verified = (date: string | null) =>
    date
      ? new Date(date).toLocaleDateString("en-US", { timeZone: "UTC" })
      : "Not verified";
  const media = product.media.filter(
    (m) => !m.variant_id || m.variant_id === variant?.id,
  );
  return (
    <article className="catalog-product-view">
      {product.synthetic && (
        <p className="catalog-fixture">
          Synthetic rehearsal record · No real product, price or compatibility
          claim
        </p>
      )}
      <div className="catalog-product-intro">
        <div>
          <p className="catalog-eyebrow">
            {catalogFamilies.find((f) => f.id === product.family_id)?.name}
          </p>
          <h1>{product.title}</h1>
          <p className="catalog-product-maker">
            {product.manufacturer_name || "Manufacturer not recorded"}
          </p>
        </div>
        <p className="catalog-record-status">
          {product.status === "published"
            ? "Published catalog record"
            : "Private draft preview"}
        </p>
      </div>
      <div className="catalog-product-grid">
        <Gallery media={media} />
        <div className="catalog-spec-summary">
          <p className="catalog-description">
            {product.description || "A description has not been recorded."}
          </p>
          {product.variants.length > 1 && (
            <label>
              Variant
              <select
                value={variant?.id}
                onChange={(e) => setSelected(e.target.value)}
              >
                {product.variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.key}
                    {v.finish ? ` — ${v.finish}` : ""}
                  </option>
                ))}
              </select>
            </label>
          )}
          {variant && (
            <>
              <h2>Part numbers &amp; attributes</h2>
              <dl className="catalog-specs">
                <dt>Manufacturer part number</dt>
                <dd>
                  {variant.numbers
                    .filter((n) => n.kind === "manufacturer" && n.verified_at)
                    .map((n) => n.value)
                    .join(", ") || "No verified number recorded"}
                </dd>
                <dt>Alternate identifiers</dt>
                <dd>
                  {variant.numbers
                    .filter((n) => n.kind === "alternate" && n.verified_at)
                    .map((n) => n.value)
                    .join(", ") || "No verified alternate recorded"}
                </dd>
                {[
                  ["Finish", variant.finish],
                  ["Color", variant.color],
                  ["Handedness", variant.handedness],
                  ["Material", variant.material],
                ].map(([name, value]) => (
                  <div className="catalog-dl-row" key={name}>
                    <dt>{name}</dt>
                    <dd>
                      {variant.verified_at && value && value !== "unknown"
                        ? value
                        : "Not verified"}
                    </dd>
                  </div>
                ))}
              </dl>
            </>
          )}
          <div className="catalog-purchasing">
            <h3>Supplier purchasing</h3>
            <p>
              Purchasing links are not enabled in this catalog foundation. No
              checkout or affiliate destination is provided.
            </p>
          </div>
          <Link
            href="/find-part/guided"
            className="catalog-button catalog-secondary"
          >
            Need help identifying your part?
          </Link>
        </div>
      </div>
      <div className="catalog-product-sections">
        <section>
          <h2>Verified measurements</h2>
          <p>
            Compare the named measurement and its units. A dimension alone does
            not confirm fit.
          </p>
          {variant?.dimensions.some((d) => d.verified_at && d.source_id) ? (
            <div className="catalog-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Measurement</th>
                    <th>Value</th>
                    <th>Verified</th>
                  </tr>
                </thead>
                <tbody>
                  {variant.dimensions
                    .filter((d) => d.verified_at && d.source_id)
                    .map((d) => (
                      <tr key={d.id}>
                        <td>{d.label}</td>
                        <td>
                          {d.value} {d.unit}
                        </td>
                        <td>{verified(d.verified_at)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>No verified dimensions have been recorded.</p>
          )}
          <Link href="/guides/measurements">How to measure hardware →</Link>
        </section>
        <section>
          <h2>Compatibility documentation</h2>
          {variant?.compatibility.some((c) => c.verified_at && c.source_id) ? (
            variant.compatibility
              .filter((c) => c.verified_at && c.source_id)
              .map((c) => (
                <div key={c.id} className="catalog-evidence">
                  <p>{c.statement}</p>
                  <small>
                    Source:{" "}
                    {source(c.source_id)?.reference || "Recorded source"} ·
                    Verified {verified(c.verified_at)}
                  </small>
                </div>
              ))
          ) : (
            <p>
              No verified compatibility information is available. Do not assume
              interchangeability from appearance, numbers or dimensions.
            </p>
          )}
        </section>
        <section>
          <h2>Supplier records</h2>
          {variant?.offers
            .filter((o) => o.source_id && o.verified_at)
            .map((o) => (
              <div key={o.id} className="catalog-evidence">
                <h3>{o.supplier_name || "Supplier record"}</h3>
                <p>
                  Supplier SKU: <strong>{o.sku}</strong>
                </p>
                <p>
                  Availability:{" "}
                  {o.availability === "unknown"
                    ? "Not confirmed"
                    : o.availability}{" "}
                  · Last verified {verified(o.verified_at)}
                </p>
              </div>
            ))}
          {!variant?.offers.some((o) => o.verified_at) && (
            <p>No verified supplier offer has been recorded.</p>
          )}
        </section>
        <section>
          <h2>Source &amp; verification</h2>
          <p>
            {source(product.source_id)?.reference ||
              "Source documentation has not been recorded."}
          </p>
          <p>Last verified: {verified(product.verified_at)}</p>
          {source(product.source_id)?.evidence_url && (
            <a
              href={source(product.source_id)!.evidence_url}
              rel="noopener noreferrer"
            >
              View source documentation ↗
            </a>
          )}
        </section>
      </div>
    </article>
  );
}
