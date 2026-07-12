"use client";

import { useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

const TOOLBAR_BUTTON =
  "rounded px-2 py-1 text-sm hover:bg-stone-100 aria-pressed:bg-stone-200 aria-pressed:font-semibold";

export function RichTextEditor({
  name,
  defaultValueHtml,
}: {
  name: string;
  defaultValueHtml?: string | null;
}) {
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [StarterKit],
    content: defaultValueHtml ?? "",
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      if (hiddenInputRef.current) {
        hiddenInputRef.current.value = editor.isEmpty ? "" : editor.getHTML();
      }
    },
  });

  return (
    <div className="mt-1 rounded border border-stone-300">
      <input
        ref={hiddenInputRef}
        type="hidden"
        name={name}
        defaultValue={defaultValueHtml ?? ""}
      />
      <div className="flex gap-1 border-b border-stone-200 p-1">
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleBold().run()}
          aria-pressed={editor?.isActive("bold")}
          className={TOOLBAR_BUTTON}
        >
          <strong>F</strong>
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          aria-pressed={editor?.isActive("italic")}
          className={TOOLBAR_BUTTON}
        >
          <em>K</em>
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          aria-pressed={editor?.isActive("bulletList")}
          className={TOOLBAR_BUTTON}
        >
          • Liste
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          aria-pressed={editor?.isActive("orderedList")}
          className={TOOLBAR_BUTTON}
        >
          1. Liste
        </button>
      </div>
      <EditorContent
        editor={editor}
        onPointerDown={() => {
          // Manche mobilen Browser (v.a. iOS Safari) öffnen die
          // Bildschirmtastatur nicht zuverlässig, wenn ProseMirror den Fokus
          // intern setzt - ein expliziter, synchron an die Tap-Geste
          // gebundener focus()-Aufruf behebt das in den meisten Fällen.
          editor?.chain().focus().run();
        }}
        className="min-h-[6rem] touch-manipulation px-2 py-1.5 text-sm [&_.ProseMirror]:min-h-[6rem] [&_.ProseMirror]:outline-none [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
      />
    </div>
  );
}
