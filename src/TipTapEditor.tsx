// ─── <TipTapEditor> Component ───
// Universal block editor for Omnidea programs, powered by TipTap.
// Receives Y.Doc from Vizier. Daemon handles .idea persistence via Castle.
//
// The editor ALWAYS uses a Y.Doc internally (via TipTap's Collaboration
// extension). This lets the OmninetProvider connect/disconnect at any time
// without recreating the editor. The Y.Doc handles local editing perfectly
// fine without remote peers — when a provider connects, sync begins
// automatically because the Y.Doc is already wired to ProseMirror.
//
// Usage:
//   import { TipTapEditor } from '@omnidea/editor';
//   <TipTapEditor ideaId={id} ydoc={vizier.acquireDoc(id)} />
//
// With collaboration cursors:
//   <TipTapEditor ideaId={id} ydoc={vizier.acquireDoc(id)} provider={vizier.getProvider(id)} />

import { onMount, onCleanup, createSignal, createEffect } from 'solid-js';
import { Editor } from '@tiptap/core';
import { Collaboration } from '@tiptap/extension-collaboration';
import { CollaborationCursor } from '@tiptap/extension-collaboration-cursor';
import { useCastle } from '@castle/cornerstone';
import { ideaExtensionsForCollab } from './extensions/index.js';
import { markdownToHtml, htmlToMarkdown } from './adapter/index.js';
import { EditorToolbar } from './EditorToolbar.js';
import * as Y from 'yjs';
import './editor.css';

import type { EditorOpenResult } from './bridge.js';

export interface TipTapEditorProps {
  /** The idea UUID to edit. */
  ideaId: string;
  /** The field name within the idea (default: "body"). */
  fieldName?: string;
  /** Called when dirty state changes (for save indicators). */
  onDirtyChange?: (dirty: boolean) => void;
  /** Y.Doc to use (from Vizier). Always required for Collaboration extension. */
  ydoc?: Y.Doc;
  /** OmninetProvider for cursor rendering (from Vizier). Optional — cursors appear when present. */
  provider?: unknown;
  /** Additional CSS class for the editor container. */
  class?: string;
}

export function TipTapEditor(props: TipTapEditorProps) {
  let containerRef: HTMLDivElement | undefined;
  let digitId: string | null = null;
  let unsubSaved: (() => void) | undefined;

  // Y.Doc: from Vizier (shared with provider) or fresh (solo editing)
  const ydoc = props.ydoc ?? new Y.Doc();

  const castle = useCastle();
  const field = () => props.fieldName ?? 'body';
  const [ready, setReady] = createSignal(false);
  const [initialHtml, setInitialHtml] = createSignal('');

  // ── Load initial content from daemon ──

  onMount(async () => {
    try {
      const result = await castle.court('editor.open', {
        id: props.ideaId,
        field: field(),
      }) as EditorOpenResult;

      const entries = Object.entries(result.fields ?? {});
      if (entries.length === 0) {
        setInitialHtml('<p></p>');
        setReady(true);
        return;
      }

      const [foundDigitId, digitData] = entries[0];
      digitId = foundDigitId;
      const markdown = digitData.text || '';
      loadedMarkdownLength = markdown.length;
      setInitialHtml(markdownToHtml(markdown));
      setReady(true);
    } catch (err) {
      console.warn('[editor] failed to open:', err);
      setInitialHtml('<p></p>');
      setReady(true);
    }
  });

  // ── Create editor once ──

  const [editor, setEditor] = createSignal<Editor | undefined>();

  createEffect(() => {
    if (!ready() || !containerRef) return;
    if (editor()) return;

    const identity = castle.identity();
    const user = {
      name: identity?.display_name ?? castle.program.name ?? 'Anonymous',
      color: identity?.color ?? '#7c3aed',
    };

    const html = initialHtml();

    // ALWAYS use Collaboration extension with the Y.Doc. This means:
    // - Y.Doc is always wired to ProseMirror (edits flow to Y.Doc)
    // - When a provider connects later, remote changes appear automatically
    // - UndoRedo disabled (Yjs handles undo via its own history)
    const extensions = [
      ...ideaExtensionsForCollab(),
      Collaboration.configure({ document: ydoc }),
    ];

    // Add cursor rendering if a provider is available (already connected by Vizier)
    if (props.provider) {
      extensions.push(
        CollaborationCursor.configure({ provider: props.provider, user }),
      );
    }

    const ed = new Editor({
      element: containerRef!,
      extensions,
      content: html,
      onUpdate: ({ editor: updatedEd }) => {
        syncContent(updatedEd);
      },
    });

    // Inject content if the Y.Doc is empty. When the Y.Doc already has
    // content (e.g. from DocManager for a returning collab note), the
    // Collaboration extension uses it and ignores the content option.
    const ydocHasContent = ydoc.getXmlFragment('default').length > 0;
    if (!ydocHasContent && html && html !== '<p></p>') {
      ed.commands.setContent(html);
    }

    setEditor(ed);
  });

  // ── Sync content to daemon ──

  let loadedMarkdownLength = 0;
  let settled = false;

  function syncContent(ed: Editor) {
    if (!digitId) return;

    const markdown = htmlToMarkdown(ed.getHTML());

    // Skip the Collaboration init sync: if we loaded real content but
    // the first update is empty, the Collaboration extension cleared it.
    if (!settled) {
      if (loadedMarkdownLength > 0 && markdown.length === 0) {
        return;
      }
      settled = true;
    }

    props.onDirtyChange?.(true);

    castle.court('editor.set_content', {
      id: props.ideaId,
      digit_id: digitId,
      field: field(),
      content: markdown,
    }).catch((err: unknown) => console.warn('[editor] save failed:', err));
  }

  // ── Subscribe to save events ──

  onMount(() => {
    try {
      unsubSaved = castle.on('editor.saved', (data: unknown) => {
        const event = data as { id: string };
        if (event.id === props.ideaId) {
          props.onDirtyChange?.(false);
        }
      });
    } catch {
      // Event subscription not available
    }
  });

  // ── Cleanup ──

  onCleanup(() => {
    editor()?.destroy();
    unsubSaved?.();
    castle.court('editor.close', { id: props.ideaId })
      .catch(() => {});
  });

  return (
    <div class={`tiptap-editor ${props.class ?? ''}`}>
      <EditorToolbar editor={editor} />
      <div ref={containerRef} />
    </div>
  );
}
