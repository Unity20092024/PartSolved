import { marked } from "marked";
import { parseDocument } from "htmlparser2";
import {
  plainText,
  cleanBody,
  safeLink,
  mediaUrl,
  uuid,
  type RichNode,
} from "./content";

type HtmlNode = {
  type: string;
  name?: string;
  data?: string;
  attribs?: Record<string, string>;
  children?: HtmlNode[];
};
type Mark = NonNullable<RichNode["marks"]>[number];
const blocked = new Set([
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "svg",
  "math",
  "form",
  "input",
  "button",
  "template",
]);
const paragraph = (content: RichNode[]): RichNode => ({
  type: "paragraph",
  ...(content.length ? { content } : {}),
});
const nonempty = (nodes: RichNode[]) =>
  nodes.length ? nodes : [paragraph([])];
const children = (node: HtmlNode) => node.children || [];
function inline(nodes: HtmlNode[], marks: Mark[] = [], depth = 0): RichNode[] {
  if (depth > 16) throw new Error("Imported content is too deeply nested.");
  return nodes.flatMap((node): RichNode[] => {
    if (node.type === "text")
      return node.data
        ? [
            {
              type: "text",
              text: node.data,
              ...(marks.length ? { marks } : {}),
            },
          ]
        : [];
    const name = node.name || "";
    if (blocked.has(name) || name === "img") return [];
    if (name === "br") return [{ type: "hardBreak" }];
    const type = (
      {
        strong: "bold",
        b: "bold",
        em: "italic",
        i: "italic",
        s: "strike",
        del: "strike",
        code: "code",
      } as Record<string, string>
    )[name];
    if (type)
      return inline(
        children(node),
        [...marks.filter((m) => m.type !== type), { type }],
        depth + 1,
      );
    if (name === "a") {
      const href = safeLink(node.attribs?.href);
      return inline(
        children(node),
        href
          ? [
              ...marks.filter((m) => m.type !== "link"),
              { type: "link", attrs: { href } },
            ]
          : marks,
      );
    }
    return inline(children(node), marks, depth + 1);
  });
}
function blocks(nodes: HtmlNode[], depth = 0): RichNode[] {
  if (depth > 16) throw new Error("Imported content is too deeply nested.");
  const output: RichNode[] = [],
    pending: HtmlNode[] = [];
  const flush = () => {
    const content = inline(pending);
    if (content.some((n) => n.type !== "text" || n.text?.trim()))
      output.push(paragraph(content));
    pending.length = 0;
  };
  for (const node of nodes) {
    const name = node.name || "";
    if (blocked.has(name)) {
      flush();
      continue;
    }
    if (
      node.type === "text" ||
      [
        "strong",
        "b",
        "em",
        "i",
        "s",
        "del",
        "a",
        "code",
        "br",
        "span",
      ].includes(name)
    ) {
      pending.push(node);
      continue;
    }
    flush();
    if (/^h[1-6]$/.test(name))
      output.push({
        type: "heading",
        attrs: { level: name === "h1" || name === "h2" ? 2 : 3 },
        content: inline(children(node)),
      });
    else if (name === "figure") {
      const image = children(node).find((child) => child.name === "img");
      const figure = image ? blocks([image], depth + 1) : [];
      const caption = children(node).find(
        (child) => child.name === "figcaption",
      );
      if (figure[0]?.attrs && caption)
        figure[0].attrs.caption = plainText(
          paragraph(inline(children(caption))),
        ).slice(0, 1000);
      output.push(...figure);
    } else if (
      name === "aside" &&
      node.attribs?.["data-affiliate-button"] !== undefined
    ) {
      const anchor = children(node).find((child) => child.name === "a");
      const href = safeLink(anchor?.attribs?.href);
      const label = anchor
        ? plainText(paragraph(inline(children(anchor))))
            .trim()
            .slice(0, 160)
        : "";
      if (href && !href.startsWith("/") && label)
        output.push({ type: "affiliateButton", attrs: { href, label } });
    } else if (name === "p")
      output.push(...nonempty(blocks(children(node), depth + 1)));
    else if (name === "ul" || name === "ol")
      output.push({
        type: name === "ul" ? "bulletList" : "orderedList",
        ...(name === "ol"
          ? { attrs: { start: Number(node.attribs?.start) || 1 } }
          : {}),
        content: children(node)
          .filter((n) => n.name === "li")
          .map((n) => ({
            type: "listItem",
            content: nonempty(blocks(children(n), depth + 1)),
          })),
      });
    else if (name === "blockquote")
      output.push({
        type: "blockquote",
        content: blocks(children(node), depth + 1),
      });
    else if (name === "hr") output.push({ type: "horizontalRule" });
    else if (name === "img") {
      const id =
        node.attribs?.["data-media-id"] ||
        node.attribs?.src?.match(/^\/blog\/media\/([a-f0-9-]+)$/)?.[1];
      if (uuid(id))
        output.push({
          type: "image",
          attrs: {
            mediaId: id,
            src: mediaUrl(id),
            alt: node.attribs?.alt || "",
            caption: node.attribs?.["data-caption"] || "",
          },
        });
    } else if (name === "table")
      output.push({
        type: "table",
        content: tableRows(children(node), depth + 1),
      });
    else output.push(...blocks(children(node), depth + 1));
  }
  flush();
  return output;
}
function tableRows(nodes: HtmlNode[], depth: number): RichNode[] {
  if (depth > 16) throw new Error("Imported table is too deeply nested.");
  return nodes.flatMap((node) =>
    node.name === "tr"
      ? [
          {
            type: "tableRow",
            content: children(node)
              .filter((n) => n.name === "td" || n.name === "th")
              .map((n) => ({
                type: n.name === "th" ? "tableHeader" : "tableCell",
                attrs: {
                  colspan: Math.min(10, Number(n.attribs?.colspan) || 1),
                  rowspan: Math.min(20, Number(n.attribs?.rowspan) || 1),
                },
                content: nonempty(blocks(children(n), depth + 1)),
              })),
          },
        ]
      : tableRows(children(node), depth + 1),
  );
}
export function importArticleText(source: string): RichNode {
  if (source.length > 200000)
    throw new Error("Import at most 200,000 characters at a time.");
  const html = marked.parse(source, { async: false, gfm: true });
  return cleanBody({
    type: "doc",
    content: blocks(parseDocument(html).children as unknown as HtmlNode[]),
  });
}
export function hasImportedSyntax(text: string) {
  return /(?:^|\n)\s*(?:#{1,6}\s|[-*+]\s|\d+[.)]\s|---\s*$|>\s)|\*\*[^*]+\*\*|\[[^\]]+\]\([^\s)]+\)|<\/?[a-z][^>]*>|(?:^|\s)[*_][^*_\n]+[*_](?=\s|[.,!?]|$)|~~[^~]+~~|`[^`]+`/im.test(
    text,
  );
}
function sourceText(node: RichNode): string {
  if (node.type === "hardBreak") return "\n";
  let text = node.text || "";
  for (const mark of node.marks || []) {
    if (mark.type === "bold") text = `**${text}**`;
    else if (mark.type === "italic") text = `*${text}*`;
    else if (mark.type === "strike") text = `~~${text}~~`;
    else if (mark.type === "code")
      text = `${"`".repeat(text.includes("`") ? 2 : 1)}${text}${"`".repeat(text.includes("`") ? 2 : 1)}`;
    else if (mark.type === "link")
      text = `[${text}](${mark.attrs?.href || ""})`;
  }
  return text;
}
/** Non-destructive view conversion; database changes only follow an explicit save. */
export function normalizeImportedBody(input: RichNode): RichNode {
  const body = cleanBody(input);
  const containsLegacySyntax = (node: RichNode): boolean =>
    (node.type === "text" && hasImportedSyntax(node.text || "")) ||
    !!node.content?.some(containsLegacySyntax);
  const legacyImport = containsLegacySyntax(body);
  const normalize = (node: RichNode): RichNode[] => {
    const text = (node.content || [])
      .map((n) => (n.type === "hardBreak" ? "\n" : n.text || ""))
      .join("");
    if (
      ["paragraph", "heading"].includes(node.type) &&
      node.content?.every((n) => n.type === "text" || n.type === "hardBreak") &&
      hasImportedSyntax(text)
    ) {
      const parsed = importArticleText(node.content.map(sourceText).join(""));
      if (
        node.type === "heading" &&
        parsed.content?.length === 1 &&
        parsed.content[0].type === "paragraph" &&
        text.length < 180
      )
        return [{ ...parsed.content[0], type: "heading", attrs: node.attrs }];
      if (
        node.type === "paragraph" &&
        /^\*\*[^*]+\?\*\*$/.test(text.trim()) &&
        parsed.content?.length === 1
      )
        return [{ ...parsed.content[0], type: "heading", attrs: { level: 3 } }];
      return parsed.content || [];
    }
    // Recover a malformed legacy import: a long introduction placed in a
    // one-item list together with an empty editor table. Preserve every word.
    if (node.type === "bulletList" && node.content?.length === 1) {
      const parts = node.content[0].content || [];
      if (
        parts.some((part) => part.type === "table" && !plainText(part)) &&
        parts.some(
          (part) =>
            part.type === "heading" &&
            plainText(part).length > 180 &&
            hasImportedSyntax(plainText(part)),
        )
      )
        return parts
          .filter((part) => part.type !== "table" && !!plainText(part))
          .flatMap(normalize);
    }
    if (
      legacyImport &&
      node.type === "paragraph" &&
      node.content?.every(
        (part) => part.type === "text" && !part.marks?.length,
      ) &&
      /^What (?:Is|Are) [^?\n]{5,100}\?$/.test(text)
    )
      return [{ ...node, type: "heading", attrs: { level: 2 } }];
    if (!node.content) return [node];
    const converted = node.content.flatMap(normalize),
      merged: RichNode[] = [];
    for (const child of converted) {
      const previous = merged.at(-1);
      if (
        previous &&
        ["bulletList", "orderedList"].includes(child.type) &&
        previous.type === child.type
      )
        previous.content = [
          ...(previous.content || []),
          ...(child.content || []),
        ];
      else merged.push(child);
    }
    return [{ ...node, content: merged }];
  };
  return cleanBody(normalize(body)[0]);
}
