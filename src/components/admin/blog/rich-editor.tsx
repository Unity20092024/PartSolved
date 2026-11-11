"use client";
import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import ImageExtension from "@tiptap/extension-image";
import { TableKit } from "@tiptap/extension-table";
import {
  mediaUrl,
  safeLink,
  type RichNode,
  type BlogMedia,
} from "@/lib/blog/content";
const ManagedImage = ImageExtension.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      mediaId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-media-id"),
        renderHTML: (attrs) => ({ "data-media-id": attrs.mediaId }),
      },
    };
  },
});
export default function RichEditor({
  value,
  onChange,
  disabled,
  media,
}: {
  value: RichNode;
  onChange: (body: RichNode) => void;
  disabled: boolean;
  media: BlogMedia[];
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        codeBlock: false,
        underline: false,
        link: { openOnClick: false, protocols: ["http", "https"] },
      }),
      ManagedImage,
      TableKit.configure({ table: { resizable: false } }),
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
    },
    onUpdate: ({ editor }) => onChange(editor.getJSON() as RichNode),
  });
  useEffect(() => {
    editor?.setEditable(!disabled, false);
  }, [editor, disabled]);
  if (!editor) return <p>Loading article editor…</p>;
  const command = (label: string, action: () => void, active = false) => (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={active}
      onClick={action}
    >
      {label}
    </button>
  );
  return (
    <section aria-label="Rich text editing">
      <div className="admin-toolbar" role="group" aria-label="Formatting">
        {command("Paragraph", () =>
          editor.chain().focus().setParagraph().run(),
        )}
        {command(
          "H2",
          () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
          editor.isActive("heading", { level: 2 }),
        )}
        {command(
          "H3",
          () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
          editor.isActive("heading", { level: 3 }),
        )}
        {command(
          "Bold",
          () => editor.chain().focus().toggleBold().run(),
          editor.isActive("bold"),
        )}
        {command(
          "Italic",
          () => editor.chain().focus().toggleItalic().run(),
          editor.isActive("italic"),
        )}
        {command("Bullet list", () =>
          editor.chain().focus().toggleBulletList().run(),
        )}
        {command("Numbered list", () =>
          editor.chain().focus().toggleOrderedList().run(),
        )}
        {command("Link", () => {
          const input = prompt(
            "HTTP(S) URL or internal path",
            editor.getAttributes("link").href || "/guides",
          );
          if (input === null) return;
          if (!input) {
            editor.chain().focus().unsetLink().run();
            return;
          }
          const href = safeLink(input);
          if (!href) {
            alert("Use a valid HTTP(S) URL or internal path.");
            return;
          }
          editor
            .chain()
            .focus()
            .extendMarkRange("link")
            .setLink({ href })
            .run();
        })}
        {command("Remove link", () => editor.chain().focus().unsetLink().run())}
        {command("Table", () =>
          editor
            .chain()
            .focus()
            .insertTable({ rows: 3, cols: 2, withHeaderRow: true })
            .run(),
        )}
        {command("Delete table", () =>
          editor.chain().focus().deleteTable().run(),
        )}
        {command("Undo", () => editor.chain().focus().undo().run())}
        {command("Redo", () => editor.chain().focus().redo().run())}
      </div>
      <EditorContent editor={editor} />
      <label>
        Insert an uploaded image
        <select
          disabled={disabled}
          value=""
          onChange={(e) => {
            const item = media.find((m) => m.id === e.target.value);
            if (!item) return;
            editor
              .chain()
              .focus()
              .insertContent({
                type: "image",
                attrs: {
                  src: mediaUrl(item.id),
                  alt: item.alt,
                  mediaId: item.id,
                },
              })
              .run();
          }}
        >
          <option value="">Choose image</option>
          {media
            .filter((m) => m.state === "ready")
            .map((m) => (
              <option key={m.id} value={m.id}>
                {m.alt}
              </option>
            ))}
        </select>
      </label>
      <p className="blog-muted">
        Paste text and formatting normally. Upload images through the image
        manager, then insert them here. External pasted images are not accepted.
      </p>
    </section>
  );
}
