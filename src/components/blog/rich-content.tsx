import { Fragment, type ReactNode } from "react";
import { cleanBody, safeLink, type RichNode } from "@/lib/blog/content";
import { BlogImage } from "./blog-image";
// Explicit React elements escape text and attributes. Never render stored HTML.
export function RichContent({
  body,
  preview = false,
}: {
  body: RichNode;
  preview?: boolean;
}) {
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
        return <p key={index}>{children}</p>;
      case "heading":
        return node.attrs?.level === 3 ? (
          <h3 key={index}>{children}</h3>
        ) : (
          <h2 key={index}>{children}</h2>
        );
      case "bulletList":
        return <ul key={index}>{children}</ul>;
      case "orderedList":
        return <ol key={index}>{children}</ol>;
      case "listItem":
        return <li key={index}>{children}</li>;
      case "blockquote":
        return <blockquote key={index}>{children}</blockquote>;
      case "hardBreak":
        return <br key={index} />;
      case "horizontalRule":
        return <hr key={index} />;
      case "image":
        return (
          <BlogImage
            key={index}
            id={String(node.attrs?.mediaId)}
            alt={String(node.attrs?.alt || "")}
            preview={preview}
            className="blog-inline-image"
          />
        );
      case "table":
        return (
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
        );
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
  return <div className="blog-prose">{render(cleanBody(body), 0)}</div>;
}
