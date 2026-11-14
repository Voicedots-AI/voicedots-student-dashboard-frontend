import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  EditorContent,
  useEditor,
  type Editor,
  type JSONContent,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Image,
  Smile,
  Maximize2,
  Minimize2,
  X,
  Undo2,
  Redo2,
} from "lucide-react";
import katex from "katex";
import "katex/dist/katex.min.css";
import "./message-editor.css";
export type MessageDocument = JSONContent;
const extensions = () => [
  StarterKit.configure({
    heading: false,
    blockquote: false,
    codeBlock: false,
    horizontalRule: false,
    link: false,
  }),
  TextAlign.configure({
    types: ["paragraph"],
    alignments: ["left", "center", "right"],
  }),

];
function plainDocument(text: string): JSONContent {
  return {
    type: "doc",
    content: text
      .split("\n")
      .map((line) => ({
        type: "paragraph",
        content: line ? [{ type: "text", text: line }] : [],
      })),
  };
}
// Render the bounded JSON schema as React elements. Plain legacy messages stay plain text.
export function MessageBody({
  document,
  text,
}: {
  document?: MessageDocument | null;
  text: string;
}) {
  const render = (node: MessageDocument, key: number): React.ReactNode => {
    const children = node.content?.map((child, index) => render(child, index));
    if (node.type === "text") {
      let value: React.ReactNode = node.text || "";
      for (const mark of node.marks || []) {
        if (mark.type === "bold") value = <strong>{value}</strong>;
        else if (mark.type === "italic") value = <em>{value}</em>;
        else if (mark.type === "underline") value = <u>{value}</u>;
        else if (mark.type === "strike") value = <s>{value}</s>;
        else if (mark.type === "superscript") value = <sup>{value}</sup>;
        else if (mark.type === "subscript") value = <sub>{value}</sub>;
        else if (mark.type === "code") value = <code>{value}</code>;
      }
      return <span key={key}>{value}</span>;
    }
    if (node.type === "inlineMath" || node.type === "blockMath") {
      const latex = String(node.attrs?.latex || "").slice(0, 1000);
      return (
        <span
          key={key}
          className="mw-saved-math"
          dangerouslySetInnerHTML={{
            __html: katex.renderToString(latex, {
              displayMode: node.type === "blockMath",
              throwOnError: false,
              trust: false,
              maxExpand: 100,
              maxSize: 10,
            }),
          }}
        />
      );
    }
    if (node.type === "paragraph") {
      const align = node.attrs?.textAlign;
      return (
        <p
          key={key}
          style={{
            textAlign: ["left", "center", "right"].includes(align)
              ? align
              : undefined,
          }}
        >
          {children?.length ? children : <br />}
        </p>
      );
    }
    if (node.type === "bulletList") return <ul key={key}>{children}</ul>;
    if (node.type === "orderedList")
      return (
        <ol key={key} start={node.attrs?.start || 1}>
          {children}
        </ol>
      );
    if (node.type === "listItem") return <li key={key}>{children}</li>;
    if (node.type === "hardBreak") return <br key={key} />;
    return <span key={key}>{children}</span>;
  };
  return (
    <div className="mw-rich-body">
      {document?.type === "doc" ? (
        document.content?.map((node, index) => render(node, index))
      ) : (
        <p>{text}</p>
      )}
    </div>
  );
}
function EmojiMenu({
  onSelect,
  onClose,
  anchor,
}: {
  onSelect: (emoji: string) => void;
  onClose: () => void;
  anchor: { current: HTMLDivElement | null };
}) {
  const host = useRef<HTMLDivElement>(null),
    popup = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 12, left: 12 }),
    [loading, setLoading] = useState(true),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    const place = () => {
      const rect = anchor.current?.getBoundingClientRect();
      if (!rect) return;
      const height = Math.min(440, window.innerHeight - 24),
        width = Math.min(354, window.innerWidth - 24);
      setPosition({
        top: Math.max(
          12,
          Math.min(
            rect.top >= height + 12 ? rect.top - height - 8 : rect.bottom + 8,
            window.innerHeight - height - 12,
          ),
        ),
        left: Math.max(
          12,
          Math.min(rect.right - width, window.innerWidth - width - 12),
        ),
      });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    const outside = (e: PointerEvent) => {
      if (
        !popup.current?.contains(e.target as Node) &&
        !anchor.current?.contains(e.target as Node)
      )
        onClose();
    };
    window.addEventListener("pointerdown", outside);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("pointerdown", outside);
    };
  }, [anchor, onClose]);
  useEffect(() => {
    let active = true;
    void Promise.all([import("emoji-mart"), import("@emoji-mart/data")])
      .then(([{ Picker }, { default: data }]) => {
        if (!active || !host.current) return;
        const picker = new Picker({
          data,
          theme: "light",
          set: "native",
          autoFocus: true,
          previewPosition: "none",
          skinTonePosition: "search",
          onEmojiSelect: (emoji: { native: string }) => onSelect(emoji.native),
        });
        host.current.replaceChildren(picker as unknown as Node);
        setLoading(false);
      })
      .catch(() => {
        if (active) {
          setFailed(true);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);
  return createPortal(
    <div
      ref={popup}
      className="mw-emoji-menu"
      style={position}
      role="dialog"
      aria-label="Choose an emoji"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <header>
        <strong>Choose an emoji</strong>
        <button type="button" aria-label="Close emoji picker" onClick={onClose}>
          <X size={16} />
        </button>
      </header>
      {loading && <p role="status">Loading emojis…</p>}
      {failed && (
        <p role="alert">Unable to open emojis. Close and try again.</p>
      )}
      <div ref={host} />
    </div>,
    document.body,
  );
}
export default function MessageEditor({
  text,
  document,
  onChange,
  label,
  disabled = false,
  onImage,
  editorRef,
  onSend,
}: {
  text: string;
  document?: MessageDocument | null;
  onChange: (text: string, document: MessageDocument | null) => void;
  label: string;
  disabled?: boolean;
  onImage: () => void;
  editorRef?: { current: Editor | null };
  onSend?: () => void;
}) {
  const emojiAnchor = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false),
    [emoji, setEmoji] = useState(false);
  const sendRef=useRef(onSend);
  sendRef.current=onSend;
  const disabledRef=useRef(disabled);
  disabledRef.current=disabled;
  const editor = useEditor({
    extensions: extensions(),
    content: document || plainDocument(text),
    editable: !disabled,
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    editorProps: {
      handleKeyDown: (_view,event)=>{
        if(event.key!=="Enter" || event.isComposing || event.keyCode===229)return false;
        if(event.shiftKey)return false;
        if(!sendRef.current)return false;
        event.preventDefault();
        if(!disabledRef.current)sendRef.current();
        return true;
      },
      attributes: {
        role: "textbox",
        "aria-label": label,
        "aria-multiline": "true",
        "data-placeholder":
          label === "Reply message" ? "Type a reply…" : "Write your message…",
        class: "mw-rich-input",
      },
    },
    onUpdate: ({ editor }) =>
      onChange(
        editor.getText({
          blockSeparator: "\n",
          textSerializers: {
            inlineMath: ({ node }) => node.attrs.latex,
            blockMath: ({ node }) => node.attrs.latex,
          },
        }),
        editor.isEmpty ? null : editor.getJSON(),
      ),
  });
  useEffect(() => {
    editor?.setEditable(!disabled, false);
  }, [editor, disabled]);
  useEffect(() => {
    if (editorRef) editorRef.current = editor;
    return () => {
      if (editorRef) editorRef.current = null;
    };
  }, [editor, editorRef]);
  useEffect(() => {
    if (!editor) return;
    if (!text && !document && !editor.isEmpty)
      editor.commands.clearContent(false);
    else if (
      text !==
        editor.getText({
          blockSeparator: "\n",
          textSerializers: {
            inlineMath: ({ node }) => node.attrs.latex,
            blockMath: ({ node }) => node.attrs.latex,
          },
        }) &&
      !document
    )
      editor.commands.setContent(plainDocument(text), { emitUpdate: false });
  }, [editor, text, document]);
  useEffect(() => {
    if (!expanded) return;
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setExpanded(false);
      }
    };
    window.addEventListener("keydown", close, true);
    return () => window.removeEventListener("keydown", close, true);
  }, [expanded]);
  const tool = (
    name: string,
    icon: React.ReactNode,
    run: () => void,
    active = false,
  ) => (
    <button
      type="button"
      title={name}
      aria-label={name}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={run}
    >
      {icon}
    </button>
  );
  return (
    <div className={`mw-message-editor ${expanded ? "is-expanded" : ""}`}>
      <div
        className="mw-format-toolbar"
        role="toolbar"
        aria-label={`${label} formatting`}
      >
        {tool(
          "Bold",
          <Bold size={15} />,
          () => editor?.chain().focus().toggleBold().run(),
          editor?.isActive("bold"),
        )}
        {tool(
          "Italic",
          <Italic size={15} />,
          () => editor?.chain().focus().toggleItalic().run(),
          editor?.isActive("italic"),
        )}
        {tool(
          "Underline",
          <Underline size={15} />,
          () => editor?.chain().focus().toggleUnderline().run(),
          editor?.isActive("underline"),
        )}
        {tool(
          "Strikethrough",
          <Strikethrough size={15} />,
          () => editor?.chain().focus().toggleStrike().run(),
          editor?.isActive("strike"),
        )}
        <i />
        {tool(
          "Align left",
          <AlignLeft size={15} />,
          () => editor?.chain().focus().setTextAlign("left").run(),
          editor?.isActive({ textAlign: "left" }),
        )}
        {tool(
          "Align center",
          <AlignCenter size={15} />,
          () => editor?.chain().focus().setTextAlign("center").run(),
          editor?.isActive({ textAlign: "center" }),
        )}
        {tool(
          "Align right",
          <AlignRight size={15} />,
          () => editor?.chain().focus().setTextAlign("right").run(),
          editor?.isActive({ textAlign: "right" }),
        )}
        {tool(
          "Bulleted list",
          <List size={15} />,
          () => editor?.chain().focus().toggleBulletList().run(),
          editor?.isActive("bulletList"),
        )}
        {tool(
          "Numbered list",
          <ListOrdered size={15} />,
          () => editor?.chain().focus().toggleOrderedList().run(),
          editor?.isActive("orderedList"),
        )}
        <i />
        {tool(
          "Attach image",
          <>
            <Image size={15} />
            <span>Image</span>
          </>,
          onImage,
        )}
        <div className="mw-emoji-anchor" ref={emojiAnchor}>
          {tool(
            "Choose emoji",
            <Smile size={17} />,
            () => {
              setEmoji((v) => !v);
            },
            emoji,
          )}
          {emoji && (
            <EmojiMenu
              anchor={emojiAnchor}
              onClose={() => {
                setEmoji(false);
                editor?.commands.focus();
              }}
              onSelect={(value) => {
                editor
                  ?.chain()
                  .focus()
                  .insertContent({ type: "text", text: value })
                  .run();
                setEmoji(false);
              }}
            />
          )}
        </div>
        {tool("Undo", <Undo2 size={15} />, () =>
          editor?.chain().focus().undo().run(),
        )}
        {tool("Redo", <Redo2 size={15} />, () =>
          editor?.chain().focus().redo().run(),
        )}
        <span className="mw-editor-spacer" />
        {tool(
          expanded ? "Exit expanded editor" : "Expand editor",
          expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />,
          () => setExpanded((v) => !v),
        )}
      </div>
      <EditorContent editor={editor} />
      <footer className="mw-editor-hint">
        <span>{onSend ? "Enter to send · Shift+Enter for a new line" : "Enter for a new line"}</span>
        <span className={text.length > 10000 ? "mw-editor-error" : ""}>
          {text.length.toLocaleString()} / 10,000
        </span>
      </footer>
    </div>
  );
}
