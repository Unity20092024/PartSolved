import { SITE_ORIGIN, siteUrl } from "@/config/site";
export class ContentError extends Error {}
export type RichNode = {
  type: string;
  text?: string;
  attrs?: Record<string, string | number | null>;
  marks?: { type: string; attrs?: Record<string, string> }[];
  content?: RichNode[];
};
export const guideTopics = {
  "screw-spacing": "Screw-hole spacing",
  "overall-size": "Overall length and width",
  "roller-diameter": "Roller diameter",
  "roller-housing": "Roller housing",
  "window-balances": "Window balances",
  "balance-fittings": "Balance end fittings",
  "lock-backset": "Lock backset",
  orientation: "Left/right orientation",
} as const;
export interface ArticleDocument {
  title: string;
  slug: string;
  excerpt: string;
  body: RichNode;
  category_id: string | null;
  author: string;
  featured_image_id: string | null;
  featured_alt: string;
  social_image_id: string | null;
  social_alt: string;
  seo_title: string;
  meta_description: string;
  canonical_url: string;
  hardware_category: string;
  related_guides: string[];
}
export interface Article {
  media_ids: string[];
  scheduled_document?: ArticleDocument | null;
  scheduled_media_ids?: string[];
  id: string;
  document: ArticleDocument;
  version: number;
  status: "draft" | "published" | "scheduled";
  created_at: string;
  updated_at: string;
  published_at: string | null;
  scheduled_at: string | null;
  job_error: string | null;
}
export interface Publication {
  post_id: string;
  document: ArticleDocument;
  slug: string;
  category_id: string | null;
  published_at: string;
  updated_at: string;
  media_ids: string[];
}
export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
}
export interface BlogMedia {
  id: string;
  path: string;
  alt: string;
  width: number;
  height: number;
  bytes: number;
  state: "uploading" | "ready" | "deleting";
  created_at: string;
}
export const uuid = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
export const validSlug = (slug: string) =>
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) &&
  slug.length <= 100 &&
  !["admin", "api", "category", "media", "preview", "login", "new"].includes(
    slug,
  );
export const mediaUrl = (id: string) => `/blog/media/${id}`;
export function safeLink(value: unknown): string | null {
  if (
    typeof value !== "string" ||
    value.length > 2048 ||
    /[\u0000-\u0020\\]/.test(value)
  )
    return null;
  try {
    const url = new URL(value, SITE_ORIGIN);
    if (["partsolved.com", "www.partsolved.com"].includes(url.hostname)) {
      url.protocol = "https:";
      url.hostname = "www.partsolved.com";
      url.port = "";
    }
    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      return null;
    if (/^\/(?:admin|api)(?:\/|$)/.test(url.pathname)) return null;
    return url.origin === SITE_ORIGIN
      ? `${url.pathname}${url.search}${url.hash}`
      : url.href;
  } catch {
    return null;
  }
}
export function canonicalFor(
  document: Pick<ArticleDocument, "slug" | "canonical_url">,
) {
  return document.canonical_url || siteUrl(`/blog/${document.slug}`);
}
export function validCanonical(value: string) {
  if (!value) return true;
  try {
    const u = new URL(value);
    return (
      u.origin === SITE_ORIGIN &&
      u.href === value &&
      !u.search &&
      !u.hash &&
      !u.username &&
      !u.password &&
      !/^\/(?:admin|api)(?:\/|$)/.test(u.pathname)
    );
  } catch {
    return false;
  }
}
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
export function cleanBody(value: unknown): RichNode {
  let count = 0,
    characters = 0;
  const clean = (node: unknown, depth: number): RichNode => {
    if (
      !object(node) ||
      typeof node.type !== "string" ||
      ++count > 5000 ||
      depth > 16
    )
      throw new ContentError("Article structure is invalid or too large.");
    const allowed = [
      "doc",
      "paragraph",
      "text",
      "heading",
      "bulletList",
      "orderedList",
      "listItem",
      "blockquote",
      "hardBreak",
      "horizontalRule",
      "image",
      "table",
      "tableRow",
      "tableCell",
      "tableHeader",
    ];
    if (!allowed.includes(node.type))
      throw new ContentError("That article element is not supported.");
    const result: RichNode = { type: node.type };
    if (node.type === "text") {
      if (
        typeof node.text !== "string" ||
        (characters += node.text.length) > 200_000
      )
        throw new ContentError("Article text is too large.");
      result.text = node.text;
      if (Array.isArray(node.marks) && node.marks.length > 5)
        throw new ContentError("Too many text formatting marks.");
      if (Array.isArray(node.marks))
        result.marks = node.marks.map((mark) => {
          if (
            !object(mark) ||
            !["bold", "italic", "strike", "code", "link"].includes(
              String(mark.type),
            )
          )
            throw new ContentError("Unsupported text formatting.");
          if (mark.type === "link") {
            const href = safeLink(object(mark.attrs) ? mark.attrs.href : null);
            if (!href)
              throw new ContentError("Use a valid HTTP(S) or internal link.");
            return { type: "link", attrs: { href } };
          }
          return { type: String(mark.type) };
        });
    }
    if (node.type === "heading") {
      const level = object(node.attrs) ? node.attrs.level : null;
      if (![2, 3].includes(Number(level)))
        throw new ContentError("Use H2 or H3 article headings.");
      result.attrs = { level: Number(level) };
    }
    if (node.type === "image") {
      const attrs = object(node.attrs) ? node.attrs : {};
      if (
        !uuid(attrs.mediaId) ||
        typeof attrs.alt !== "string" ||
        attrs.alt.length > 300
      )
        throw new ContentError(
          "Choose an uploaded image and descriptive alt text.",
        );
      result.attrs = {
        mediaId: attrs.mediaId,
        src: mediaUrl(attrs.mediaId),
        alt: attrs.alt.trim(),
      };
    }
    if (["tableCell", "tableHeader"].includes(node.type)) {
      const attrs = object(node.attrs) ? node.attrs : {};
      result.attrs = {
        colspan: Math.max(1, Math.min(10, Number(attrs.colspan) || 1)),
        rowspan: Math.max(1, Math.min(20, Number(attrs.rowspan) || 1)),
      };
    }
    if (node.content !== undefined) {
      if (
        !Array.isArray(node.content) ||
        ["text", "image", "hardBreak", "horizontalRule"].includes(node.type)
      )
        throw new ContentError("Invalid article structure.");
      result.content = node.content.map((child) => clean(child, depth + 1));
    }
    return result;
  };
  const result = clean(value, 0);
  if (result.type !== "doc")
    throw new ContentError("Article body must be a rich-text document.");
  return result;
}
export function plainText(node: RichNode): string {
  return [node.text ?? "", ...(node.content ?? []).map(plainText)]
    .join(" ")
    .trim();
}
export function wordCount(body: RichNode) {
  return plainText(body).split(/\s+/).filter(Boolean).length;
}
export function imageIds(body: RichNode): string[] {
  return [
    ...new Set([
      ...(body.type === "image" && typeof body.attrs?.mediaId === "string"
        ? [body.attrs.mediaId]
        : []),
      ...(body.content ?? []).flatMap(imageIds),
    ]),
  ];
}
export function cleanDocument(
  value: unknown,
  publish = false,
): ArticleDocument {
  if (!object(value))
    throw new ContentError("Article information is required.");
  const read = (key: string, limit: number) => {
    if (typeof value[key] !== "string" || value[key].length > limit)
      throw new ContentError(`Check ${key.replaceAll("_", " ")}.`);
    return value[key].trim();
  };
  const id = (key: string) => {
    if (value[key] === null || value[key] === "") return null;
    if (!uuid(value[key]))
      throw new ContentError("Invalid image/category reference.");
    return value[key];
  };
  const document: ArticleDocument = {
    title: read("title", 200),
    slug: read("slug", 100),
    excerpt: read("excerpt", 500),
    body: cleanBody(value.body),
    category_id: id("category_id"),
    author: read("author", 120),
    featured_image_id: id("featured_image_id"),
    featured_alt: read("featured_alt", 300),
    social_image_id: id("social_image_id"),
    social_alt: read("social_alt", 300),
    seo_title: read("seo_title", 200),
    meta_description: read("meta_description", 320),
    canonical_url: read("canonical_url", 2048),
    hardware_category: read("hardware_category", 40),
    related_guides: [],
  };
  if (!validSlug(document.slug) || !validCanonical(document.canonical_url))
    throw new ContentError(
      "Use a unique URL slug and a canonical URL on https://www.partsolved.com.",
    );
  if (
    ![
      "",
      "window-hardware",
      "window-parts",
      "door-hardware",
      "door-parts",
      "not-sure",
    ].includes(document.hardware_category)
  )
    throw new ContentError("Choose an existing hardware category.");
  if (
    !Array.isArray(value.related_guides) ||
    value.related_guides.some(
      (v) => typeof v !== "string" || !Object.hasOwn(guideTopics, v),
    )
  )
    throw new ContentError("Choose an existing measurement guide.");
  document.related_guides = [...new Set(value.related_guides as string[])];
  if (
    publish &&
    (!document.title ||
      !document.author ||
      !document.excerpt ||
      !plainText(document.body))
  )
    throw new ContentError(
      "Add a title, real author name, excerpt and article text before publishing.",
    );
  if (
    publish &&
    ((document.featured_image_id && !document.featured_alt) ||
      (document.social_image_id && !document.social_alt))
  )
    throw new ContentError(
      "Add alt text for your sharing and featured images.",
    );
  if (publish) {
    const visit = (node: RichNode) => {
      if (node.type === "image" && !node.attrs?.alt)
        throw new ContentError(
          "Every inline image needs descriptive alt text.",
        );
      node.content?.forEach(visit);
    };
    visit(document.body);
  }
  return document;
}
export function emptyArticle(slug: string): ArticleDocument {
  return {
    title: "",
    slug,
    excerpt: "",
    body: { type: "doc", content: [{ type: "paragraph" }] },
    category_id: null,
    author: "",
    featured_image_id: null,
    featured_alt: "",
    social_image_id: null,
    social_alt: "",
    seo_title: "",
    meta_description: "",
    canonical_url: "",
    hardware_category: "",
    related_guides: [],
  };
}
export function jsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
