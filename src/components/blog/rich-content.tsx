import { Fragment, type ReactNode } from "react";
import {
  cleanBody,
  safeLink,
  plainText,
  type RichNode,
} from "@/lib/blog/content";
import { normalizeImportedBody } from "@/lib/blog/import-format";
import { BlogImage } from "./blog-image";
export function RichContent({
  body,
  preview = false,
}: {
  body: RichNode;
  preview?: boolean;
}) {
  let heading = 0;
  const render = (node: RichNode, index: number): ReactNode => {
    const children = node.content?.map(render);
    switch (node.type) {
      case "doc":
        return <Fragment key={index}>{children}</Fragment>;
      case "text":
        return (
          <Fragment key={index}>
            {node.marks?.reduce<ReactNode>((text, mark, i) => {
              if (mark.type === "bold") return <strong key={i}>{text}</strong>;
              if (mark.type === "italic") return <em key={i}>{text}</em>;
              if (mark.type === "strike") return <s key={i}>{text}</s>;
              if (mark.type === "code") return <code key={i}>{text}</code>;
              const href = safeLink(mark.attrs?.href);
              return href ? (
                <a key={i} href={href} rel="noopener noreferrer">
                  {text}
                </a>
              ) : (
                text
              );
            }, node.text) ?? node.text}
          </Fragment>
        );
      case "paragraph":
        return node.content?.length ? <p key={index}>{children}</p> : null;
      case "heading": {
        const id = `article-section-${++heading}`;
        return node.attrs?.level === 3 ? (
          <h3 id={id} key={index}>
            {children}
          </h3>
        ) : (
          <h2 id={id} key={index}>
            {children}
          </h2>
        );
      }
      case "bulletList":
        return <ul key={index}>{children}</ul>;
      case "orderedList":
        return (
          <ol key={index} start={Number(node.attrs?.start) || 1}>
            {children}
          </ol>
        );
      case "listItem":
        return <li key={index}>{children}</li>;
      case "blockquote":
        return <blockquote key={index}>{children}</blockquote>;
      case "hardBreak":
        return <br key={index} />;
      case "horizontalRule":
        return <hr key={index} />;
      case "affiliateButton":
        return (
          <aside
            key={index}
            className="article-affiliate"
            aria-label="Affiliate product link"
          >
            <span>Affiliate link · Retailer website</span>
            <a
              href={String(node.attrs?.href)}
              rel="sponsored nofollow noopener noreferrer"
            >
              {String(node.attrs?.label)} <span aria-hidden="true">↗</span>
            </a>
            <p>
              Check current product details and options on the retailer’s
              website.
            </p>
          </aside>
        );
      case "image":
        return (
          <figure key={index} className="article-figure">
            <BlogImage
              id={String(node.attrs?.mediaId)}
              alt={String(node.attrs?.alt || "")}
              preview={preview}
              className="blog-inline-image"
            />
            {node.attrs?.caption && (
              <figcaption>{String(node.attrs.caption)}</figcaption>
            )}
          </figure>
        );
      case "table":
        return plainText(node) ? (
          <div
            key={index}
            className="blog-table"
            tabIndex={0}
            role="region"
            aria-label="Article table"
          >
            <table>
              <tbody>{children}</tbody>
            </table>
          </div>
        ) : null;
      case "tableRow":
        return <tr key={index}>{children}</tr>;
      case "tableHeader":
        return (
          <th
            key={index}
            colSpan={Number(node.attrs?.colspan) || 1}
            rowSpan={Number(node.attrs?.rowspan) || 1}
          >
            {children}
          </th>
        );
      case "tableCell":
        return (
          <td
            key={index}
            colSpan={Number(node.attrs?.colspan) || 1}
            rowSpan={Number(node.attrs?.rowspan) || 1}
          >
            {children}
          </td>
        );
      default:
        return null;
    }
  };
  // Structured allowlist conversion only; stored/pasted HTML is never injected.
  return (
    <div className="blog-prose article-prose">
      {render(cleanBody(normalizeImportedBody(body)), 0)}
    </div>
  );
}
