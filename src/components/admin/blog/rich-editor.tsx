"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TableKit } from "@tiptap/extension-table";
import { TextSelection, type SelectionBookmark } from "@tiptap/pm/state";
import { safeLink, type RichNode, type BlogMedia } from "@/lib/blog/content";
import { hasImportedSyntax, importArticleText } from "@/lib/blog/import-format";
import {
  ManagedImage,
  AffiliateButton,
  ContextualImageInsert,
} from "./editor-extensions";
import { EditorImageDialog, type ArticleImage } from "./editor-image-dialog";

function LinkDialog({
  affiliate,
  initial,
  onClose,
  onApply,
}: {
  affiliate: boolean;
  initial: string;
  onClose: () => void;
  onApply: (href: string, label: string) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    [href, setHref] = useState(initial),
    [label, setLabel] = useState(affiliate ? "View product details" : ""),
    [error, setError] = useState("");
  useEffect(() => {
    const element = ref.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  function submit(event: FormEvent) {
    event.preventDefault();
    const url = safeLink(href.trim());
    if (!url || (affiliate && url.startsWith("/"))) {
      setError(
        "Use a valid HTTP(S) retailer URL or, for ordinary links, an internal path.",
      );
      return;
    }
    onApply(url, label.trim());
    onClose();
  }
  return (
    <dialog
      ref={ref}
      className="editor-dialog"
      aria-labelledby="link-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <form onSubmit={submit}>
        <div className="editor-dialog-heading">
          <h2 id="link-dialog-title">
            {affiliate ? "Add affiliate button" : "Add or edit link"}
          </h2>
          <button
            type="button"
            aria-label="Close link dialog"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        {error && <p role="alert">{error}</p>}
        <label>
          Link address
          <input
            type="text"
            inputMode="url"
            value={href}
            onChange={(event) => setHref(event.target.value)}
            required
            maxLength={2048}
          />
        </label>
        <label>
          {affiliate
            ? "Button label"
            : "Link text (optional when text is selected)"}
          <input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            maxLength={160}
            required={affiliate}
          />
        </label>
        {affiliate && (
          <p>
            Displayed as an affiliate link to the retailer. No prices,
            availability or compatibility claims are added.
          </p>
        )}
        <div className="editor-dialog-actions">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="editor-primary">
            {affiliate ? "Insert affiliate button" : "Apply link"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
function ToolbarButton({
  label,
  onClick,
  active,
  disabled,
}: {
  label: string;
  onClick: () => void;
  active: boolean;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={active}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
export default function RichEditor({
  value,
  onChange,
  disabled,
  media,
  onMediaCreated,
}: {
  value: RichNode;
  onChange: (body: RichNode) => void;
  disabled: boolean;
  media: BlogMedia[];
  onMediaCreated: (image: BlogMedia) => void;
}) {
  const bookmark = useRef<SelectionBookmark | null>(null),
    shell = useRef<HTMLElement>(null);
  const [imageDialog, setImageDialog] = useState<{
    editing: boolean;
    initial?: ArticleImage;
  } | null>(null);
  const [linkDialog, setLinkDialog] = useState<{
    affiliate: boolean;
    initial: string;
  } | null>(null);
  const [, selectionChanged] = useState(0),
    [notice, setNotice] = useState("");
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        codeBlock: false,
        underline: false,
        link: { openOnClick: false, protocols: ["http", "https"] },
      }),
      ManagedImage,
      AffiliateButton,
      TableKit.configure({ table: { resizable: false } }),
      ContextualImageInsert,
    ],
    immediatelyRender: false,
    content: value,
    editable: !disabled,
    editorProps: {
      attributes: {
        class: "admin-rich-editor blog-prose",
        role: "textbox",
        "aria-label": "Article body",
        "aria-multiline": "true",
      },
      scrollThreshold: 80,
      scrollMargin: 120,
      handlePaste: (_view, event) => {
        const text = event.clipboardData?.getData("text/plain") || "",
          html = event.clipboardData?.getData("text/html") || "";
        if (!hasImportedSyntax(text) && !html) return false;
        try {
          const parsed = importArticleText(
            hasImportedSyntax(text) ? text : html,
          );
          event.preventDefault();
          editor?.commands.insertContent(parsed.content || []);
          setNotice(
            "Pasted formatting converted safely. Your draft autosaves as you edit.",
          );
        } catch {
          setNotice(
            "That content could not be imported. Paste a smaller section; existing text is unchanged.",
          );
        }
        return true;
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getJSON() as RichNode),
    onSelectionUpdate: () => selectionChanged((value) => value + 1),
    onTransaction: ({ transaction }) => {
      if (bookmark.current)
        bookmark.current = bookmark.current.map(transaction.mapping);
    },
  });
  useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom;
    const insert = (event: Event) => {
      if (!editor.isEditable) return;
      bookmark.current = TextSelection.near(
        editor.state.doc.resolve((event as CustomEvent<number>).detail),
      ).getBookmark();
      setImageDialog({ editing: false });
    };
    dom.addEventListener("article-insert-image", insert);
    return () => dom.removeEventListener("article-insert-image", insert);
  }, [editor]);
  useEffect(() => {
    editor?.setEditable(!disabled, false);
  }, [editor, disabled]);
  useEffect(() => {
    const viewport = window.visualViewport;
    const update = () =>
      shell.current?.style.setProperty(
        "--editor-visible-height",
        `${viewport?.height || window.innerHeight}px`,
      );
    update();
    viewport?.addEventListener("resize", update);
    return () => viewport?.removeEventListener("resize", update);
  }, []);
  if (!editor) return <p>Loading article editor…</p>;
  const capture = () => {
    bookmark.current = editor.state.selection.getBookmark();
  };
  const restore = () => {
    if (bookmark.current)
      editor.commands.command(({ tr }) => {
        tr.setSelection(bookmark.current!.resolve(tr.doc));
        return true;
      });
  };
  const focus = () => requestAnimationFrame(() => editor.commands.focus());
  const image = editor.isActive("image") ? editor.getAttributes("image") : null;
  const openImage = () => {
    capture();
    setImageDialog({
      editing: !!image,
      initial: image
        ? {
            mediaId: String(image.mediaId),
            src: String(image.src),
            alt: String(image.alt || ""),
            caption: String(image.caption || ""),
          }
        : undefined,
    });
  };
  return (
    <section
      ref={shell}
      className="editor-shell"
      aria-label="Rich text editing"
    >
      <div
        className="admin-toolbar editor-sticky-toolbar"
        role="group"
        aria-label="Formatting"
      >
        <ToolbarButton
          label={"Bold"}
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          disabled={disabled || false}
        />
        <ToolbarButton
          label={"H2"}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          active={editor.isActive("heading", { level: 2 })}
          disabled={disabled || false}
        />
        <ToolbarButton
          label={"Image"}
          onClick={openImage}
          active={!!image}
          disabled={disabled || false}
        />
        <ToolbarButton
          label={"Link"}
          onClick={() => {
            capture();
            setLinkDialog({
              affiliate: false,
              initial: editor.getAttributes("link").href || "",
            });
          }}
          active={editor.isActive("link")}
          disabled={disabled || false}
        />
        <ToolbarButton
          label={"H3"}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          active={editor.isActive("heading", { level: 3 })}
          disabled={disabled || false}
        />
        <ToolbarButton
          label={"Paragraph"}
          onClick={() => editor.chain().focus().setParagraph().run()}
          active={false}
          disabled={disabled || false}
        />
        <ToolbarButton
          label={"Italic"}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          disabled={disabled || false}
        />
        <ToolbarButton
          label={"Bullet list"}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          disabled={disabled || false}
        />
        <ToolbarButton
          label={"Numbered list"}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
          disabled={disabled || false}
        />
        <ToolbarButton
          label={"Quote"}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive("blockquote")}
          disabled={disabled || false}
        />
        <ToolbarButton
          label={"Affiliate button"}
          onClick={() => {
            capture();
            setLinkDialog({ affiliate: true, initial: "" });
          }}
          active={false}
          disabled={disabled || false}
        />
        <ToolbarButton
          label={"Remove link"}
          onClick={() => editor.chain().focus().unsetLink().run()}
          active={false}
          disabled={disabled || false}
        />
        <ToolbarButton
          label={"Edit image"}
          onClick={openImage}
          active={false}
          disabled={disabled || !image}
        />
        <ToolbarButton
          label={"Remove image"}
          onClick={() => editor.chain().focus().deleteSelection().run()}
          active={false}
          disabled={disabled || !image}
        />
        <ToolbarButton
          label={"Table"}
          onClick={() =>
            editor
              .chain()
              .focus()
              .insertTable({ rows: 3, cols: 2, withHeaderRow: true })
              .run()
          }
          active={false}
          disabled={disabled || false}
        />
        <ToolbarButton
          label={"Delete table"}
          onClick={() => editor.chain().focus().deleteTable().run()}
          active={false}
          disabled={disabled || false}
        />
        <ToolbarButton
          label={"Undo"}
          onClick={() => editor.chain().focus().undo().run()}
          active={false}
          disabled={disabled || false}
        />
        <ToolbarButton
          label={"Redo"}
          onClick={() => editor.chain().focus().redo().run()}
          active={false}
          disabled={disabled || false}
        />
      </div>
      {notice && (
        <p className="editor-notice" role="status">
          {notice}
        </p>
      )}
      <EditorContent editor={editor} />
      <p className="editor-hint">
        Select text, then use Bold or H2. Tap Image at your cursor, or ＋ Image
        between paragraphs. Swipe the toolbar for more tools. Select an image
        and tap Edit image to replace it or change its caption and alt text.
      </p>
      {imageDialog && (
        <EditorImageDialog
          media={media}
          initial={imageDialog.initial}
          editing={imageDialog.editing}
          onUploaded={onMediaCreated}
          onClose={() => {
            setImageDialog(null);
            focus();
          }}
          onApply={(attrs) => {
            restore();
            if (imageDialog.editing)
              editor.chain().updateAttributes("image", attrs).run();
            else editor.chain().insertContent({ type: "image", attrs }).run();
            bookmark.current = null;
          }}
        />
      )}
      {linkDialog && (
        <LinkDialog
          affiliate={linkDialog.affiliate}
          initial={linkDialog.initial}
          onClose={() => {
            setLinkDialog(null);
            focus();
          }}
          onApply={(href, label) => {
            restore();
            if (linkDialog.affiliate)
              editor.commands.insertContent({
                type: "affiliateButton",
                attrs: { href, label },
              });
            else if (editor.state.selection.empty && label)
              editor.commands.insertContent({
                type: "text",
                text: label,
                marks: [{ type: "link", attrs: { href } }],
              });
            else editor.chain().extendMarkRange("link").setLink({ href }).run();
            bookmark.current = null;
          }}
        />
      )}
    </section>
  );
}
