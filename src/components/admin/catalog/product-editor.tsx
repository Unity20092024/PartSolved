"use client";
import { useEffect, useRef, useState } from "react";
import { ProductView } from "@/components/catalog/product-view";
import {
  cleanProduct,
  catalogFamilies,
  newVariant,
  type ProductDraft,
  type CatalogProduct,
  type CatalogVariant,
  type CatalogCollections,
} from "@/lib/catalog/model";
import type { CatalogPort } from "./catalog-port";
import { downloadJson } from "./catalog-port";
import { VerificationFields } from "./verification-fields";
import { CatalogMediaManager } from "./catalog-media-manager";
function Section({
  title,
  add,
  children,
}: {
  title: string;
  add: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="catalog-repeat">
      <div className="catalog-section-heading">
        <h3>{title}</h3>
        <button type="button" className="catalog-small-button" onClick={add}>
          + Add {title.toLowerCase()}
        </button>
      </div>
      {children}
    </section>
  );
}
export function CatalogEditor({
  initial,
  collections,
  port,
  onSaved,
  onBack,
  enabled = true,
  rehearsal = false,
}: {
  initial: CatalogProduct | ProductDraft;
  collections: CatalogCollections;
  port: CatalogPort;
  onSaved: (p: CatalogProduct) => void;
  onBack: () => void;
  enabled?: boolean;
  rehearsal?: boolean;
}) {
  const [doc, setDoc] = useState<ProductDraft>(initial),
    [product, setProduct] = useState<CatalogProduct>(
      "status" in initial
        ? initial
        : {
            ...initial,
            status: "draft",
            created_at: "",
            updated_at: "",
            media: [],
          },
    ),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(false),
    [preview, setPreview] = useState(false);
  const saved = useRef(JSON.stringify(initial));
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const change = (next: ProductDraft) => {
    setDoc(next);
    setDirty(JSON.stringify(next) !== saved.current);
    setMessage("Unsaved catalog edits.");
  };
  const updateVariant = (index: number, value: CatalogVariant) =>
    change({
      ...doc,
      variants: doc.variants.map((v, i) => (i === index ? value : v)),
    });
  async function save(status?: string) {
    setBusy(true);
    setMessage("");
    try {
      let result = await port.save(cleanProduct(doc));
      setProduct(result);
      setDoc(result);
      saved.current = JSON.stringify(result);
      setDirty(false);
      onSaved(result);
      if (status) result = await port.transition(result, status);
      setProduct(result);
      setDoc(result);
      saved.current = JSON.stringify(result);
      setDirty(false);
      onSaved(result);
      setMessage(
        rehearsal
          ? "Rehearsal draft updated in browser memory only."
          : status
            ? `Catalog state: ${result.status}.`
            : "Catalog draft saved.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Save failed. Your edits are retained.",
      );
    } finally {
      setBusy(false);
    }
  }
  const back = () => {
    if (!dirty || confirm("Discard unsaved catalog edits?")) onBack();
  };
  if (preview)
    return (
      <>
        <button
          type="button"
          className="catalog-button catalog-secondary"
          onClick={() => setPreview(false)}
        >
          ← Back to editing
        </button>
        <p className="catalog-notice">
          Private catalog preview. Unsaved edits are included here; nothing is
          published by viewing this page.
        </p>
        <ProductView
          product={{ ...product, ...doc, media: product.media }}
          sources={collections.sources}
        />
      </>
    );
  return (
    <>
      <div className="catalog-section-heading">
        <button
          type="button"
          className="catalog-text-button"
          disabled={busy}
          onClick={back}
        >
          ← Catalog records
        </button>
        <span>
          {product.status} · Revision {doc.revision}
        </span>
      </div>
      <h2>{doc.revision ? "Edit catalog product" : "Add a product draft"}</h2>
      <p className="catalog-note">
        Manufacturer numbers and supplier SKUs are different identifiers.
        Unknown measurements can stay blank. Saving changes takes the product
        out of public publication until it is reviewed and published again.
      </p>
      <fieldset disabled={!enabled || busy} className="catalog-editor-fields">
        <div className="catalog-field-grid">
          <label>
            Product title
            <input
              value={doc.title}
              maxLength={200}
              onChange={(e) => change({ ...doc, title: e.target.value })}
              required
            />
          </label>
          <label>
            Product URL slug
            <input
              value={doc.slug}
              maxLength={100}
              onChange={(e) => change({ ...doc, slug: e.target.value })}
              required
            />
          </label>
          <label>
            Manufacturer
            <select
              value={doc.manufacturer_id || ""}
              onChange={(e) =>
                change({ ...doc, manufacturer_id: e.target.value || null })
              }
            >
              <option value="">Not recorded</option>
              {collections.manufacturers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Hardware family
            <select
              value={doc.family_id}
              onChange={(e) => change({ ...doc, family_id: e.target.value })}
            >
              {catalogFamilies.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Description
          <textarea
            value={doc.description}
            maxLength={10000}
            onChange={(e) => change({ ...doc, description: e.target.value })}
          />
        </label>
        <label className="catalog-checkbox">
          <input
            type="checkbox"
            checked={doc.synthetic}
            disabled={doc.revision > 0 && product.synthetic}
            onChange={(e) => change({ ...doc, synthetic: e.target.checked })}
          />
          This is synthetic or development data (cannot be published)
        </label>
        <VerificationFields
          label="Product verification"
          value={doc}
          onChange={(v) => change({ ...doc, ...v })}
          collections={collections}
        />
        {doc.variants.map((v, index) => (
          <section className="catalog-variant-editor" key={v.id}>
            <div className="catalog-section-heading">
              <h2>Variant {index + 1}</h2>
              {doc.variants.length > 1 && (
                <button
                  type="button"
                  className="catalog-small-button"
                  onClick={() =>
                    change({
                      ...doc,
                      variants: doc.variants.filter((_, i) => i !== index),
                    })
                  }
                >
                  Remove variant
                </button>
              )}
            </div>
            <div className="catalog-field-grid">
              <label>
                Variant key
                <input
                  value={v.key}
                  maxLength={80}
                  onChange={(e) =>
                    updateVariant(index, { ...v, key: e.target.value })
                  }
                />
              </label>
              {(["finish", "color", "material"] as const).map((key) => (
                <label key={key}>
                  {key[0].toUpperCase() + key.slice(1)}
                  <input
                    value={v[key]}
                    maxLength={80}
                    onChange={(e) =>
                      updateVariant(index, { ...v, [key]: e.target.value })
                    }
                  />
                </label>
              ))}
              <label>
                Handedness
                <select
                  value={v.handedness}
                  onChange={(e) =>
                    updateVariant(index, {
                      ...v,
                      handedness: e.target
                        .value as CatalogVariant["handedness"],
                    })
                  }
                >
                  <option value="unknown">Not known</option>
                  <option value="left">Left</option>
                  <option value="right">Right</option>
                  <option value="non-handed">Non-handed</option>
                </select>
              </label>
            </div>
            <VerificationFields
              value={v}
              onChange={(verify) => updateVariant(index, { ...v, ...verify })}
              collections={collections}
            />
            <button
              type="button"
              className="catalog-small-button"
              onClick={() => {
                if (
                  confirm(
                    "Apply the product's source and date only if you have verified every identifier, offer, measurement and compatibility statement in this variant.",
                  )
                ) {
                  const verify = {
                    source_id: doc.source_id,
                    verified_at: doc.verified_at,
                  };
                  updateVariant(index, {
                    ...v,
                    ...verify,
                    numbers: v.numbers.map((n) => ({ ...n, ...verify })),
                    offers: v.offers.map((n) => ({ ...n, ...verify })),
                    dimensions: v.dimensions.map((n) => ({ ...n, ...verify })),
                    compatibility: v.compatibility.map((n) => ({
                      ...n,
                      ...verify,
                    })),
                  });
                }
              }}
            >
              Apply reviewed product source/date to this variant
            </button>
            <Section
              title="Part numbers"
              add={() =>
                updateVariant(index, {
                  ...v,
                  numbers: [
                    ...v.numbers,
                    {
                      id: crypto.randomUUID(),
                      kind: "manufacturer",
                      value: "",
                      source_id: null,
                      verified_at: null,
                    },
                  ],
                })
              }
            >
              {v.numbers.map((n, i) => (
                <div className="catalog-subrecord" key={n.id}>
                  <div className="catalog-field-grid">
                    <label>
                      Number type
                      <select
                        value={n.kind}
                        onChange={(e) =>
                          updateVariant(index, {
                            ...v,
                            numbers: v.numbers.map((n, j) =>
                              j === i
                                ? {
                                    ...n,
                                    kind: e.target.value as
                                      "manufacturer" | "alternate",
                                  }
                                : n,
                            ),
                          })
                        }
                      >
                        <option value="manufacturer">
                          Manufacturer part number
                        </option>
                        <option value="alternate">
                          Documented alternate identifier
                        </option>
                      </select>
                    </label>
                    <label>
                      Part number
                      <input
                        value={n.value}
                        maxLength={80}
                        onChange={(e) =>
                          updateVariant(index, {
                            ...v,
                            numbers: v.numbers.map((n, j) =>
                              j === i ? { ...n, value: e.target.value } : n,
                            ),
                          })
                        }
                      />
                    </label>
                  </div>
                  <VerificationFields
                    value={n}
                    label="Number verification"
                    collections={collections}
                    onChange={(verify) =>
                      updateVariant(index, {
                        ...v,
                        numbers: v.numbers.map((n, j) =>
                          j === i ? { ...n, ...verify } : n,
                        ),
                      })
                    }
                  />
                  <button
                    type="button"
                    className="catalog-small-button"
                    onClick={() =>
                      updateVariant(index, {
                        ...v,
                        numbers: v.numbers.filter((_, j) => i !== j),
                      })
                    }
                  >
                    Remove number
                  </button>
                </div>
              ))}
            </Section>
            <Section
              title="Supplier offers"
              add={() =>
                updateVariant(index, {
                  ...v,
                  offers: [
                    ...v.offers,
                    {
                      id: crypto.randomUUID(),
                      supplier_id: "",
                      sku: "",
                      availability: "unknown",
                      source_id: null,
                      verified_at: null,
                    },
                  ],
                })
              }
            >
              {v.offers.map((o, i) => (
                <div className="catalog-subrecord" key={o.id}>
                  <div className="catalog-field-grid">
                    <label>
                      Supplier
                      <select
                        value={o.supplier_id}
                        onChange={(e) =>
                          updateVariant(index, {
                            ...v,
                            offers: v.offers.map((o, j) =>
                              j === i
                                ? { ...o, supplier_id: e.target.value }
                                : o,
                            ),
                          })
                        }
                      >
                        <option value="">Choose supplier</option>
                        {collections.suppliers.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Supplier SKU
                      <input
                        value={o.sku}
                        maxLength={80}
                        onChange={(e) =>
                          updateVariant(index, {
                            ...v,
                            offers: v.offers.map((o, j) =>
                              j === i ? { ...o, sku: e.target.value } : o,
                            ),
                          })
                        }
                      />
                    </label>
                    <label>
                      Documented availability
                      <select
                        value={o.availability}
                        onChange={(e) =>
                          updateVariant(index, {
                            ...v,
                            offers: v.offers.map((o, j) =>
                              j === i
                                ? {
                                    ...o,
                                    availability: e.target
                                      .value as typeof o.availability,
                                  }
                                : o,
                            ),
                          })
                        }
                      >
                        {[
                          "unknown",
                          "available",
                          "unavailable",
                          "discontinued",
                        ].map((x) => (
                          <option key={x}>{x}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <VerificationFields
                    label="Offer verification"
                    value={o}
                    collections={collections}
                    onChange={(verify) =>
                      updateVariant(index, {
                        ...v,
                        offers: v.offers.map((o, j) =>
                          j === i ? { ...o, ...verify } : o,
                        ),
                      })
                    }
                  />
                  <button
                    type="button"
                    className="catalog-small-button"
                    onClick={() =>
                      updateVariant(index, {
                        ...v,
                        offers: v.offers.filter((_, j) => i !== j),
                      })
                    }
                  >
                    Remove supplier offer
                  </button>
                </div>
              ))}
            </Section>
            <Section
              title="Measurements"
              add={() =>
                updateVariant(index, {
                  ...v,
                  dimensions: [
                    ...v.dimensions,
                    {
                      id: crypto.randomUUID(),
                      key: "",
                      label: "",
                      value: 0,
                      unit: "mm",
                      source_id: null,
                      verified_at: null,
                    },
                  ],
                })
              }
            >
              {v.dimensions.map((d, i) => (
                <div className="catalog-subrecord" key={d.id}>
                  <div className="catalog-field-grid">
                    <label>
                      Measurement key
                      <input
                        value={d.key}
                        placeholder="screw-spacing"
                        maxLength={80}
                        onChange={(e) =>
                          updateVariant(index, {
                            ...v,
                            dimensions: v.dimensions.map((d, j) =>
                              j === i ? { ...d, key: e.target.value } : d,
                            ),
                          })
                        }
                      />
                    </label>
                    <label>
                      Measurement label
                      <input
                        value={d.label}
                        maxLength={100}
                        onChange={(e) =>
                          updateVariant(index, {
                            ...v,
                            dimensions: v.dimensions.map((d, j) =>
                              j === i ? { ...d, label: e.target.value } : d,
                            ),
                          })
                        }
                      />
                    </label>
                    <label>
                      Measurement value
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0.000001"
                        step="any"
                        value={d.value || ""}
                        onChange={(e) =>
                          updateVariant(index, {
                            ...v,
                            dimensions: v.dimensions.map((d, j) =>
                              j === i
                                ? { ...d, value: Number(e.target.value) }
                                : d,
                            ),
                          })
                        }
                      />
                    </label>
                    <label>
                      Measurement unit
                      <select
                        value={d.unit}
                        onChange={(e) =>
                          updateVariant(index, {
                            ...v,
                            dimensions: v.dimensions.map((d, j) =>
                              j === i
                                ? { ...d, unit: e.target.value as "mm" | "in" }
                                : d,
                            ),
                          })
                        }
                      >
                        <option value="mm">Millimeters</option>
                        <option value="in">Inches</option>
                      </select>
                    </label>
                  </div>
                  <VerificationFields
                    label="Measurement verification"
                    value={d}
                    collections={collections}
                    onChange={(verify) =>
                      updateVariant(index, {
                        ...v,
                        dimensions: v.dimensions.map((d, j) =>
                          j === i ? { ...d, ...verify } : d,
                        ),
                      })
                    }
                  />
                  <button
                    type="button"
                    className="catalog-small-button"
                    onClick={() =>
                      updateVariant(index, {
                        ...v,
                        dimensions: v.dimensions.filter((_, j) => i !== j),
                      })
                    }
                  >
                    Remove measurement
                  </button>
                </div>
              ))}
            </Section>
            <Section
              title="Compatibility statements"
              add={() =>
                updateVariant(index, {
                  ...v,
                  compatibility: [
                    ...v.compatibility,
                    {
                      id: crypto.randomUUID(),
                      statement: "",
                      target_variant_id: null,
                      source_id: null,
                      verified_at: null,
                    },
                  ],
                })
              }
            >
              {v.compatibility.map((c, i) => (
                <div className="catalog-subrecord" key={c.id}>
                  <label>
                    Documented compatibility statement
                    <textarea
                      value={c.statement}
                      maxLength={2000}
                      onChange={(e) =>
                        updateVariant(index, {
                          ...v,
                          compatibility: v.compatibility.map((c, j) =>
                            j === i ? { ...c, statement: e.target.value } : c,
                          ),
                        })
                      }
                    />
                  </label>
                  <label>
                    Target variant UUID (optional)
                    <input
                      value={c.target_variant_id || ""}
                      onChange={(e) =>
                        updateVariant(index, {
                          ...v,
                          compatibility: v.compatibility.map((c, j) =>
                            j === i
                              ? {
                                  ...c,
                                  target_variant_id: e.target.value || null,
                                }
                              : c,
                          ),
                        })
                      }
                    />
                  </label>
                  <VerificationFields
                    label="Compatibility verification"
                    value={c}
                    collections={collections}
                    onChange={(verify) =>
                      updateVariant(index, {
                        ...v,
                        compatibility: v.compatibility.map((c, j) =>
                          j === i ? { ...c, ...verify } : c,
                        ),
                      })
                    }
                  />
                  <button
                    type="button"
                    className="catalog-small-button"
                    onClick={() =>
                      updateVariant(index, {
                        ...v,
                        compatibility: v.compatibility.filter(
                          (_, j) => i !== j,
                        ),
                      })
                    }
                  >
                    Remove compatibility statement
                  </button>
                </div>
              ))}
            </Section>
          </section>
        ))}
        <button
          type="button"
          className="catalog-button catalog-secondary"
          disabled={doc.variants.length >= 20}
          onClick={() =>
            change({
              ...doc,
              variants: [
                ...doc.variants,
                { ...newVariant(), key: `variant-${doc.variants.length + 1}` },
              ],
            })
          }
        >
          + Add variant
        </button>
      </fieldset>
      {doc.revision > 0 && (
        <CatalogMediaManager
          product={product}
          collections={collections}
          port={port}
          enabled={enabled && !busy && !dirty}
          onChanged={(p) => {
            setProduct(p);
            setDoc(p);
            saved.current = JSON.stringify(p);
            setDirty(false);
            onSaved(p);
          }}
        />
      )}
      <div className="catalog-savebar">
        <p role="status" aria-live="polite">
          {message ||
            `${dirty ? "Unsaved changes" : "Ready to edit"}${rehearsal ? " · Rehearsal only" : ""}`}
        </p>
        <div className="catalog-actions">
          <button
            type="button"
            className="catalog-button"
            disabled={busy || !enabled}
            onClick={() => void save()}
          >
            Save product draft
          </button>
          <button
            type="button"
            className="catalog-button catalog-secondary"
            disabled={busy}
            onClick={() => setPreview(true)}
          >
            Preview product
          </button>
          <button
            type="button"
            className="catalog-small-button"
            disabled={busy || !enabled}
            onClick={() => void save("review")}
          >
            Mark for review
          </button>
          <button
            type="button"
            className="catalog-small-button"
            disabled={busy || !enabled || doc.synthetic}
            onClick={() => {
              if (
                confirm(
                  "Publish this real, verified catalog record? This is not a compatibility guarantee.",
                )
              )
                void save("published");
            }}
          >
            Publish product
          </button>
          {product.status === "published" && (
            <button
              type="button"
              className="catalog-small-button"
              disabled={busy || !enabled}
              onClick={() => void save("draft")}
            >
              Unpublish product
            </button>
          )}
          <button
            type="button"
            className="catalog-text-button"
            onClick={() => downloadJson("catalog-draft-backup.json", doc)}
          >
            Download unsaved backup
          </button>
        </div>
        <small>
          Publication requires real data, a manufacturer, provenance, and at
          least one verified variant and identifier. Synthetic records can never
          be published.
        </small>
      </div>
    </>
  );
}
