"use client";
import { useState } from "react";
import {
  newProduct,
  type CatalogProduct,
  type ProductDraft,
  type CatalogCollections,
  type CatalogEntity,
  type CatalogSource,
} from "@/lib/catalog/model";
import { CatalogEditor } from "./product-editor";
import { CatalogImporter } from "./catalog-importer";
import {
  httpCatalogPort,
  downloadJson,
  type CatalogPort,
  type CatalogDashboardData,
} from "./catalog-port";
export function CatalogManager({
  initial,
  enabled,
  port = httpCatalogPort,
  rehearsal = false,
}: {
  initial: CatalogDashboardData;
  enabled: boolean;
  port?: CatalogPort;
  rehearsal?: boolean;
}) {
  const [data, setData] = useState(initial),
    [tab, setTab] = useState("products"),
    [selected, setSelected] = useState<CatalogProduct | ProductDraft | null>(
      null,
    ),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [search, setSearch] = useState(""),
    [exportOffset, setExportOffset] = useState(0);
  const refresh = async () => {
    try {
      setData(await port.refresh());
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Catalog refresh failed.",
      );
    }
  };
  if (selected)
    return (
      <CatalogEditor
        initial={selected}
        collections={data.collections}
        port={port}
        enabled={enabled}
        rehearsal={rehearsal}
        onSaved={(p) => {
          setSelected(p);
          void refresh();
        }}
        onBack={() => {
          setSelected(null);
          void refresh();
        }}
      />
    );
  async function open(id: string) {
    setBusy(true);
    try {
      setSelected(await port.load(id));
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Product could not be opened.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div
        className="catalog-admin-tabs"
        role="group"
        aria-label="Catalog management sections"
      >
        {[
          ["products", "Products"],
          ["relationships", "Manufacturers & suppliers"],
          ["sources", "Sources"],
          ["imports", "Import & batches"],
        ].map(([id, label]) => (
          <button
            type="button"
            key={id}
            aria-pressed={tab === id}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <p role="status">{message}</p>
      {tab === "products" && (
        <section>
          <div className="catalog-section-heading">
            <h2>Product records</h2>
            <div className="catalog-actions">
              <button
                className="catalog-button"
                disabled={!enabled || busy}
                onClick={() => setSelected(newProduct())}
              >
                Add product
              </button>
              <label>
                Export offset
                <input
                  type="number"
                  min="0"
                  step="25"
                  value={exportOffset}
                  onChange={(e) =>
                    setExportOffset(Math.max(0, Number(e.target.value) || 0))
                  }
                />
              </label>
              <button
                className="catalog-small-button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    downloadJson(
                      "partsolved-catalog-export.json",
                      await port.export(exportOffset),
                    );
                    setMessage(
                      "Export downloaded. Check next_offset in the file for additional pages.",
                    );
                  } catch (error) {
                    setMessage(
                      error instanceof Error ? error.message : "Export failed.",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Export records
              </button>
            </div>
          </div>
          <p>
            {data.total} {rehearsal ? "synthetic rehearsal" : "catalog"} records
            · {data.products.length} shown
          </p>
          <label>
            Filter the displayed records
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Title or URL slug"
            />
          </label>
          <div className="catalog-admin-records">
            {data.products
              .filter((p) =>
                `${p.title} ${p.slug}`
                  .toLowerCase()
                  .includes(search.toLowerCase()),
              )
              .map((p) => (
                <article key={p.id}>
                  <div>
                    <h3>{p.title}</h3>
                    <p>
                      {p.status} · Revision {p.revision}
                      {p.synthetic ? " · Synthetic, never publishable" : ""}
                    </p>
                    <small>{p.slug}</small>
                  </div>
                  <button
                    className="catalog-small-button"
                    disabled={busy}
                    onClick={() => void open(p.id)}
                  >
                    Edit product
                  </button>
                </article>
              ))}
          </div>
          {!data.products.length && (
            <p>
              No catalog records have been created. Start with a sourced draft
              or a reviewed import.
            </p>
          )}
          {data.total > data.products.length && !rehearsal && (
            <nav className="catalog-actions" aria-label="Admin product pages">
              <a href="?page=1">First page</a>
              <a href={`?page=${(data.page || 1) + 1}`}>Next records →</a>
              <small>
                Exports are paged separately; next_offset is included in each
                JSON file.
              </small>
            </nav>
          )}
        </section>
      )}
      {tab === "relationships" && (
        <RelationshipManager
          collections={data.collections}
          port={port}
          enabled={enabled}
          onChanged={() => void refresh()}
        />
      )}
      {tab === "sources" && (
        <SourceManager
          collections={data.collections}
          port={port}
          enabled={enabled}
          onChanged={() => void refresh()}
        />
      )}
      {tab === "imports" && (
        <CatalogImporter
          collections={data.collections}
          port={port}
          enabled={enabled}
          batches={data.batches}
          rehearsal={rehearsal}
          onImported={() => void refresh()}
        />
      )}
    </>
  );
}
function RelationshipManager({
  collections,
  port,
  enabled,
  onChanged,
}: {
  collections: CatalogCollections;
  port: CatalogPort;
  enabled: boolean;
  onChanged: () => void;
}) {
  const [kind, setKind] = useState<"manufacturer" | "supplier">("manufacturer"),
    [record, setRecord] = useState<Partial<CatalogEntity>>({
      name: "",
      slug: "",
      website_url: "",
    }),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const rows =
    kind === "manufacturer" ? collections.manufacturers : collections.suppliers;
  return (
    <section>
      <h2>Manufacturer &amp; supplier relationships</h2>
      <p>
        A manufacturer makes the product; each supplier can assign its own SKU.
        Do not copy a supplier SKU into the manufacturer-number field without
        evidence.
      </p>
      <fieldset disabled={!enabled || busy}>
        <label>
          Record type
          <select
            value={kind}
            onChange={(e) => {
              setKind(e.target.value as typeof kind);
              setRecord({ name: "", slug: "", website_url: "" });
            }}
          >
            <option value="manufacturer">Manufacturer</option>
            <option value="supplier">Supplier</option>
          </select>
        </label>
        <label>
          Existing record
          <select
            value={record.id || ""}
            onChange={(e) =>
              setRecord(
                rows.find((r) => r.id === e.target.value) || {
                  name: "",
                  slug: "",
                  website_url: "",
                },
              )
            }
          >
            <option value="">Add a new record</option>
            {rows.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <div className="catalog-field-grid">
          <label>
            Organization name
            <input
              value={record.name || ""}
              maxLength={120}
              onChange={(e) => setRecord({ ...record, name: e.target.value })}
            />
          </label>
          <label>
            Organization slug
            <input
              value={record.slug || ""}
              maxLength={100}
              onChange={(e) => setRecord({ ...record, slug: e.target.value })}
            />
          </label>
          {kind === "supplier" && (
            <label>
              Supplier website (optional)
              <input
                type="url"
                value={record.website_url || ""}
                maxLength={2048}
                onChange={(e) =>
                  setRecord({ ...record, website_url: e.target.value })
                }
              />
            </label>
          )}
        </div>
        <button
          type="button"
          className="catalog-button"
          onClick={async () => {
            setBusy(true);
            try {
              setRecord(await port.entity(kind, record));
              setMessage(
                "Organization record saved. Purchasing links remain disabled.",
              );
              onChanged();
            } catch (error) {
              setMessage(
                error instanceof Error
                  ? error.message
                  : "Could not save the organization.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          Save organization
        </button>
      </fieldset>
      <p role="status">{message}</p>
      <h3>
        Existing {kind === "manufacturer" ? "manufacturers" : "suppliers"}
      </h3>
      <ul>
        {rows.map((row) => (
          <li key={row.id}>
            {row.name} · <code>{row.slug}</code>
          </li>
        ))}
      </ul>
      <p className="catalog-note">
        Selectors show up to 500 organizations. Catalog publication and supplier
        purchasing approvals are separate operations.
      </p>
    </section>
  );
}
function SourceManager({
  collections,
  port,
  enabled,
  onChanged,
}: {
  collections: CatalogCollections;
  port: CatalogPort;
  enabled: boolean;
  onChanged: () => void;
}) {
  const [source, setSource] = useState<Partial<CatalogSource>>({
      reference: "",
      evidence_url: "",
      verified_at: null,
    }),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <section>
      <h2>Source provenance</h2>
      <p>
        Record the authorized document, supplier file or manufacturer evidence.
        Never put API keys, private account credentials or customer photos in a
        source reference.
      </p>
      <fieldset disabled={!enabled || busy}>
        <label>
          Existing source
          <select
            value={source.id || ""}
            onChange={(e) =>
              setSource(
                collections.sources.find((s) => s.id === e.target.value) || {
                  reference: "",
                  evidence_url: "",
                  verified_at: null,
                },
              )
            }
          >
            <option value="">Add a source</option>
            {collections.sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.reference}
              </option>
            ))}
          </select>
        </label>
        <label>
          Source reference
          <input
            value={source.reference || ""}
            maxLength={500}
            onChange={(e) =>
              setSource({ ...source, reference: e.target.value })
            }
          />
        </label>
        <label>
          Evidence URL (optional)
          <input
            type="url"
            value={source.evidence_url || ""}
            maxLength={2048}
            onChange={(e) =>
              setSource({ ...source, evidence_url: e.target.value })
            }
          />
        </label>
        <label>
          Source last verified (UTC)
          <input
            type="date"
            value={source.verified_at?.slice(0, 10) || ""}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) =>
              setSource({
                ...source,
                verified_at: e.target.value
                  ? `${e.target.value}T00:00:00Z`
                  : null,
              })
            }
          />
        </label>
        <button
          type="button"
          className="catalog-button"
          onClick={async () => {
            setBusy(true);
            try {
              setSource(await port.source(source));
              setMessage("Source record saved.");
              onChanged();
            } catch (error) {
              setMessage(
                error instanceof Error
                  ? error.message
                  : "Could not save the source.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          Save provenance source
        </button>
      </fieldset>
      <p role="status">{message}</p>
    </section>
  );
}
