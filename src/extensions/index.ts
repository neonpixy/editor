// ─── TipTap Extensions ───
// Extension bundles for the Omnidea editor.
// ideaExtensions() — standard editing (with History for undo/redo).
// ideaExtensionsForCollab() — collab editing (History disabled, Yjs handles undo).
// collabExtensions() — Yjs collaboration + cursor presence.

import { StarterKit } from '@tiptap/starter-kit';
import { Image } from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { Placeholder } from '@tiptap/extension-placeholder';

import { Collaboration } from '@tiptap/extension-collaboration';
import { CollaborationCursor } from '@tiptap/extension-collaboration-cursor';
import * as Y from 'yjs';

export interface ExtensionOptions {
  placeholder?: string;
}

/** Standard editing extensions with History enabled. */
export function ideaExtensions(options?: ExtensionOptions) {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
    }),
    Image.configure({
      inline: true,
      allowBase64: true,
    }),
    Table.configure({
      resizable: true,
    }),
    TableRow,
    TableCell,
    TableHeader,
    TaskList,
    TaskItem.configure({
      nested: true,
    }),
    Placeholder.configure({
      placeholder: options?.placeholder ?? 'Start writing...',
    }),
  ];
}

/** Collab-safe extensions — UndoRedo disabled (Yjs has its own undo manager). */
export function ideaExtensionsForCollab(options?: ExtensionOptions) {
  return [
    StarterKit.configure({
      history: false,
      undoRedo: false,
      heading: { levels: [1, 2, 3] },
    }),
    Image.configure({
      inline: true,
      allowBase64: true,
    }),
    Table.configure({
      resizable: true,
    }),
    TableRow,
    TableCell,
    TableHeader,
    TaskList,
    TaskItem.configure({
      nested: true,
    }),
    Placeholder.configure({
      placeholder: options?.placeholder ?? 'Start writing...',
    }),
  ];
}

/** Yjs collaboration + cursor presence extensions. */
export function collabExtensions(
  ydoc: Y.Doc,
  provider: unknown,
  user: { name: string; color: string },
) {
  return [
    Collaboration.configure({
      document: ydoc,
    }),
    CollaborationCursor.configure({
      provider,
      user,
    }),
  ];
}
