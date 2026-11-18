"use client";
import Image from "next/image";
import { useRef, useState } from "react";
import {
  type CatalogProduct,
  type CatalogCollections,
  type CatalogMedia,
} from "@/lib/catalog/model";
import { VerificationFields } from "./verification-fields";
import type { CatalogPort } from "./catalog-port";
export function CatalogMediaManager({
  product,
  collections,
  port,
  enabled,
  onChanged,
}: {
  product: CatalogProduct;
  collections: CatalogCollections;
  port: CatalogPort;
  enabled: boolean;
  onChanged: (p: CatalogProduct) => void;
}) {
  const file = useRef<HTMLInputElement>(null),
    [alt, setAlt] = useState(""),
    [rights, setRights] = useState(""),
    [attribution, setAttribution] = useState(""),
    [confirmed, setConfirmed] = useState(false),
    [kind, setKind] = useState<"photo" | "drawing">("photo"),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  async function run(task: () => Promise<unknown>) {
    setBusy(true);
    try {
      await task();
      onChanged(await port.load(product.id));
      setMessage("Media updated. Product publication requires review again.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Image operation failed.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="catalog-media-manager">
      <h2>Authorized photos &amp; technical drawings</h2>
      <p>
        Upload only media you have permission to use. Images stay private until
        permission review; use JPEG, PNG or WebP, including raster technical
        drawings. No manufacturer images are downloaded.
      </p>
      {!enabled && (
        <p className="catalog-note">
          Save current product edits before changing its images.
        </p>
      )}
      <fieldset disabled={!enabled || busy}>
        <div className="catalog-field-grid">
          <label>
            Photo or drawing
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as typeof kind)}
            >
              <option value="photo">Product photograph</option>
              <option value="drawing">Technical drawing</option>
            </select>
          </label>
          <label>
            Image alt text
            <input
              value={alt}
              maxLength={300}
              onChange={(e) => setAlt(e.target.value)}
            />
          </label>
          <label>
            Permission / rights reference
            <input
              value={rights}
              maxLength={1000}
              onChange={(e) => setRights(e.target.value)}
              placeholder="Authorization or license reference"
            />
          </label>
          <label>
            Required attribution
            <input
              value={attribution}
              maxLength={1000}
              onChange={(e) => setAttribution(e.target.value)}
            />
          </label>
          <label>
            Choose authorized image
            <input
              ref={file}
              type="file"
              accept="image/jpeg,image/png,image/webp"
            />
          </label>
        </div>
        <label className="catalog-checkbox">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          I am authorized to upload this image for catalog review.
        </label>
        <button
          className="catalog-small-button"
          type="button"
          disabled={!confirmed || !alt.trim() || !rights.trim()}
          onClick={() =>
            void run(async () => {
              const selected = file.current?.files?.[0];
              if (!selected)
                throw new Error("Choose an authorized image first.");
              await port.upload(
                {
                  product_id: product.id,
                  alt,
                  kind,
                  rights_reference: rights,
                  attribution,
                  rights_confirmed: confirmed,
                },
                selected,
              );
              if (file.current) file.current.value = "";
            })
          }
        >
          Upload private image
        </button>
      </fieldset>
      <p role="status">{message}</p>
      <div className="catalog-media-grid">
        {product.media.map((media) => (
          <MediaReview
            key={`${media.id}-${media.permission}-${media.alt}`}
            media={media}
            collections={collections}
            disabled={!enabled || busy}
            onReview={(m) => void run(() => port.review(m))}
            onRemove={() => {
              if (confirm("Remove this catalog image and its stored file?"))
                void run(() => port.remove(media));
            }}
          />
        ))}
      </div>
    </section>
  );
}
function MediaReview({
  media,
  collections,
  disabled,
  onReview,
  onRemove,
}: {
  media: CatalogMedia;
  collections: CatalogCollections;
  disabled: boolean;
  onReview: (m: CatalogMedia) => void;
  onRemove: () => void;
}) {
  const [value, setValue] = useState(media);
  return (
    <article className="catalog-media-card">
      {media.state === "ready" && (
        <Image
          src={
            /^(data:|blob:)/.test(media.path)
              ? media.path
              : `/api/catalog/media/${media.id}`
          }
          width={media.width}
          height={media.height}
          alt={value.alt}
          unoptimized
        />
      )}
      <p>
        {media.kind} · {media.state} · Permission:{" "}
        <strong>{media.permission}</strong>
      </p>
      <fieldset disabled={disabled}>
        <label>
          Image description
          <input
            value={value.alt}
            maxLength={300}
            onChange={(e) => setValue({ ...value, alt: e.target.value })}
          />
        </label>
        <label>
          Rights evidence
          <input
            value={value.rights_reference}
            maxLength={1000}
            onChange={(e) =>
              setValue({ ...value, rights_reference: e.target.value })
            }
          />
        </label>
        <label>
          Attribution
          <input
            value={value.attribution}
            maxLength={1000}
            onChange={(e) =>
              setValue({ ...value, attribution: e.target.value })
            }
          />
        </label>
        <VerificationFields
          value={value}
          collections={collections}
          label="Media permission verification"
          onChange={(verify) => setValue({ ...value, ...verify })}
        />
        <div className="catalog-actions">
          <button
            type="button"
            className="catalog-small-button"
            onClick={() => {
              if (
                confirm(
                  "Confirm that you reviewed the recorded permission evidence and attribution.",
                )
              )
                onReview({ ...value, permission: "approved" });
            }}
          >
            Approve authorized media
          </button>
          <button
            type="button"
            className="catalog-small-button"
            onClick={() => onReview({ ...value, permission: "revoked" })}
          >
            Revoke permission
          </button>
          <button
            type="button"
            className="catalog-text-button"
            onClick={onRemove}
          >
            Remove image
          </button>
        </div>
      </fieldset>
    </article>
  );
}
