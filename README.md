> **[Omnidea](https://github.com/neonpixy/omnidea)** / **[Library](https://github.com/neonpixy/library)** / **Editor** · For AI-assisted development, see [Library CLAUDE.md](https://github.com/neonpixy/library/blob/main/CLAUDE.md).

# @omnidea/editor


CRDT-backed collaborative editor for Omnidea. The daemon owns the SequenceRga (conflict-free replicated data type); TypeScript owns the view.

## Architecture

```
User types in <Editor>
    |
    v
EditorStore (Solid.js signals)
    |  optimistic local update (immediate)
    |  + async daemon round-trip (background)
    v
bridge.ts -> window.omninet.run()
    |
    v
Chancellor editor_mod.rs (SequenceRga CRDT)
    |
    v
Vault (encrypted .idea storage)
```

Edits are optimistically applied to local state for instant feedback. The daemon processes the CRDT operation in the background and returns version/undo/redo metadata without overwriting the optimistic text.

## Usage

```typescript
import { Editor } from '@omnidea/editor';

// In a Solid.js component:
<Editor ideaId="abc-123" fieldName="body" />
```

Or use the store directly for custom UI:

```typescript
import { createEditorStore } from '@omnidea/editor';

const store = createEditorStore();
await store.open('abc-123', 'body');

// Reactive state
store.text();      // current text content
store.isDirty();   // unsaved changes?
store.canUndo();   // undo available?
store.canRedo();   // redo available?

// Operations
await store.edit(position, deleteCount, insertText);
await store.undo();
await store.redo();
await store.save();
await store.close();
```

## Exports

| Export | What |
|--------|------|
| `Editor` | Solid.js component with built-in input handling and auto-save |
| `createEditorStore` | Reactive store factory (Solid.js signals) |
| `openEditor`, `editText`, `undoEdit`, `redoEdit`, `formatText`, `updateCursor`, `saveEditor`, `closeEditor` | Low-level bridge operations (1:1 with daemon ops) |
| `onEditorChanged` | Subscribe to daemon editor.changed events |
| `attachInputHandler` | Wire up keyboard input to an editor store |
| `renderText`, `extractText` | Text rendering utilities |
| `getCursorOffset`, `setCursorOffset` | Cursor position helpers |

## Types

```typescript
interface EditOp { type: 'insert' | 'delete'; position: number; char?: string }
interface EditorState { idea_id: string; field: string; text: string; version: number; can_undo: boolean; can_redo: boolean }
interface EditResult { ops: EditOp[]; text: string; version: number; can_undo: boolean; can_redo: boolean }
interface CursorInfo { field: string; offset: number; length: number }
interface FormatRange { field: string; start: number; end: number; attribute: string; value: unknown }
interface EditorProps { ideaId: string; fieldName?: string; class?: string; onStore?: (store: EditorStore) => void }
```

## Requirements

- `window.omninet` bridge (provided by the Omny browser shell)
- `solid-js` peer dependency

## License

Licensed under the Omninet Covenant License.
