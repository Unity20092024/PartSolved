import { Extension, Node, mergeAttributes } from "@tiptap/core";
import ImageExtension from "@tiptap/extension-image";
import { Plugin } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
export const ManagedImage = ImageExtension.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      mediaId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-media-id"),
        renderHTML: (attrs) => ({ "data-media-id": attrs.mediaId }),
      },
      caption: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-caption") || "",
        renderHTML: (attrs) => ({ "data-caption": attrs.caption }),
      },
    };
  },
  renderHTML({ HTMLAttributes }) {
    const caption = String(HTMLAttributes["data-caption"] || "");
    return [
      "figure",
      { "data-article-image": "true" },
      ["img", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)],
      ...(caption ? [["figcaption", {}, caption]] : []),
    ];
  },
});
export const AffiliateButton = Node.create({
  name: "affiliateButton",
  group: "block",
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      href: { default: "" },
      label: { default: "View product details" },
    };
  },
  parseHTML() {
    return [
      {
        tag: "aside[data-affiliate-button]",
        getAttrs: (element) => ({
          href:
            (element as HTMLElement).querySelector("a")?.getAttribute("href") ||
            "",
          label:
            (element as HTMLElement).querySelector("a")?.textContent ||
            "View product details",
        }),
      },
    ];
  },
  renderHTML({ node }) {
    return [
      "aside",
      { "data-affiliate-button": "true", class: "article-affiliate" },
      ["span", {}, "Affiliate link"],
      [
        "a",
        {
          href: node.attrs.href,
          rel: "sponsored nofollow noopener noreferrer",
        },
        node.attrs.label,
      ],
    ];
  },
});
export const ContextualImageInsert = Extension.create({
  name: "contextualImageInsert",
  addProseMirrorPlugins() {
    const editor = this.editor;
    return [
      new Plugin({
        props: {
          decorations(state) {
            const { $from } = state.selection;
            if (
              !editor.isEditable ||
              !state.selection.empty ||
              !$from.depth ||
              !$from.parent.isTextblock
            )
              return DecorationSet.empty;
            const position = $from.after(1);
            return DecorationSet.create(state.doc, [
              Decoration.widget(
                position,
                () => {
                  const wrapper = document.createElement("div");
                  wrapper.className = "editor-context-insert";
                  wrapper.contentEditable = "false";
                  const button = document.createElement("button");
                  button.type = "button";
                  button.textContent = "＋ Image";
                  button.setAttribute(
                    "aria-label",
                    "Insert image after this paragraph",
                  );
                  button.addEventListener("mousedown", (event) =>
                    event.preventDefault(),
                  );
                  button.addEventListener("click", () =>
                    editor.view.dom.dispatchEvent(
                      new CustomEvent("article-insert-image", {
                        detail: position,
                      }),
                    ),
                  );
                  wrapper.append(button);
                  return wrapper;
                },
                { side: -1, key: `insert-image-${position}` },
              ),
            ]);
          },
        },
      }),
    ];
  },
});
