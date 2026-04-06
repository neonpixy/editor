// ─── <EditorToolbar> ───
// Floating toolbar for text formatting. Appears on text selection.
// Uses Remix Icon classes and Omnidea design tokens.

import { createSignal, createEffect, onCleanup, Show } from 'solid-js';
import type { Accessor } from 'solid-js';
import { createEditorTransaction } from 'solid-tiptap';
import type { Editor } from '@tiptap/core';

export interface EditorToolbarProps {
  editor: Accessor<Editor | undefined>;
}

export function EditorToolbar(props: EditorToolbarProps) {
  const [visible, setVisible] = createSignal(false);
  const [position, setPosition] = createSignal({ top: 0, left: 0 });

  // Track selection state reactively via solid-tiptap
  const isActive = (name: string, attrs?: Record<string, unknown>) => {
    return createEditorTransaction(props.editor, (ed) => {
      if (!ed) return false;
      return ed.isActive(name, attrs);
    });
  };

  const isBold = isActive('bold');
  const isItalic = isActive('italic');
  const isUnderline = isActive('underline');
  const isStrike = isActive('strike');
  const isH1 = isActive('heading', { level: 1 });
  const isH2 = isActive('heading', { level: 2 });
  const isH3 = isActive('heading', { level: 3 });
  const isBulletList = isActive('bulletList');
  const isOrderedList = isActive('orderedList');
  const isTaskList = isActive('taskList');
  const isCodeBlock = isActive('codeBlock');
  const isBlockquote = isActive('blockquote');

  // Track selection to show/hide and position the toolbar
  const selectionState = createEditorTransaction(props.editor, (ed) => {
    if (!ed) return { empty: true };
    const { from, to } = ed.state.selection;
    return { empty: from === to, from, to };
  });

  createEffect(() => {
    const sel = selectionState();
    const ed = props.editor();
    if (!sel || sel.empty || !ed) {
      setVisible(false);
      return;
    }

    // Position above the selection
    try {
      const coords = ed.view.coordsAtPos(sel.from!);
      const editorRect = ed.view.dom.closest('.tiptap-editor')?.getBoundingClientRect();
      if (editorRect) {
        setPosition({
          top: coords.top - editorRect.top - 48,
          left: coords.left - editorRect.left,
        });
      }
      setVisible(true);
    } catch {
      setVisible(false);
    }
  });

  // ── Commands ──

  function run(fn: (ed: Editor) => void) {
    const ed = props.editor();
    if (ed) fn(ed);
  }

  function btn(
    icon: string,
    active: Accessor<boolean | undefined>,
    action: (ed: Editor) => void,
    title: string,
  ) {
    return (
      <button
        class={`editor-toolbar-btn ${active() ? 'active' : ''}`}
        title={title}
        onMouseDown={(e) => {
          e.preventDefault(); // Prevent focus loss from editor
          run(action);
        }}
      >
        <i class={icon} />
      </button>
    );
  }

  return (
    <Show when={visible()}>
      <div
        class="editor-toolbar"
        style={{
          top: `${position().top}px`,
          left: `${position().left}px`,
        }}
      >
        {/* Inline formatting */}
        {btn('ri-bold', isBold, (ed) => ed.chain().focus().toggleBold().run(), 'Bold')}
        {btn('ri-italic', isItalic, (ed) => ed.chain().focus().toggleItalic().run(), 'Italic')}
        {btn('ri-underline', isUnderline, (ed) => ed.chain().focus().toggleUnderline().run(), 'Underline')}
        {btn('ri-strikethrough', isStrike, (ed) => ed.chain().focus().toggleStrike().run(), 'Strikethrough')}

        <span class="editor-toolbar-sep" />

        {/* Headings */}
        {btn('ri-h-1', isH1, (ed) => ed.chain().focus().toggleHeading({ level: 1 }).run(), 'Heading 1')}
        {btn('ri-h-2', isH2, (ed) => ed.chain().focus().toggleHeading({ level: 2 }).run(), 'Heading 2')}
        {btn('ri-h-3', isH3, (ed) => ed.chain().focus().toggleHeading({ level: 3 }).run(), 'Heading 3')}

        <span class="editor-toolbar-sep" />

        {/* Lists */}
        {btn('ri-list-unordered', isBulletList, (ed) => ed.chain().focus().toggleBulletList().run(), 'Bullet list')}
        {btn('ri-list-ordered', isOrderedList, (ed) => ed.chain().focus().toggleOrderedList().run(), 'Ordered list')}
        {btn('ri-list-check-2', isTaskList, (ed) => ed.chain().focus().toggleTaskList().run(), 'Task list')}

        <span class="editor-toolbar-sep" />

        {/* Blocks & media */}
        {btn('ri-link', () => false, (ed) => {
          const url = window.prompt('URL');
          if (url) ed.chain().focus().setLink({ href: url }).run();
        }, 'Link')}
        {btn('ri-image-line', () => false, (ed) => {
          const url = window.prompt('Image URL');
          if (url) ed.chain().focus().setImage({ src: url }).run();
        }, 'Image')}
        {btn('ri-code-box-line', isCodeBlock, (ed) => ed.chain().focus().toggleCodeBlock().run(), 'Code block')}
        {btn('ri-double-quotes-l', isBlockquote, (ed) => ed.chain().focus().toggleBlockquote().run(), 'Blockquote')}
        {btn('ri-separator', () => false, (ed) => ed.chain().focus().setHorizontalRule().run(), 'Horizontal rule')}

        <span class="editor-toolbar-sep" />

        {/* Table */}
        {btn('ri-table-line', () => false, (ed) => {
          ed.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
        }, 'Insert table')}
      </div>
    </Show>
  );
}
