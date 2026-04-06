// ─── @omnidea/editor ───
// Editor package for Omnidea programs.
// TipTap provides the editing experience. The daemon handles persistence via Castle.
// Collaboration is managed by Vizier (Omny/vizier/).

// Main component — drop-in block editor with daemon persistence
export { TipTapEditor, TipTapEditor as BlockEditor } from './TipTapEditor.js';
export type { TipTapEditorProps, TipTapEditorProps as BlockEditorProps } from './TipTapEditor.js';

// Toolbar — floating formatting toolbar (used internally, exported for custom layouts)
export { EditorToolbar } from './EditorToolbar.js';
export type { EditorToolbarProps } from './EditorToolbar.js';

// Extensions — for programs that build custom editors
export { ideaExtensions, ideaExtensionsForCollab, collabExtensions } from './extensions/index.js';

// Adapter — markdown <-> HTML conversion
export { markdownToHtml, htmlToMarkdown } from './adapter/index.js';

// Bridge operations — session management + persistence
export {
  openEditor,
  setContent,
  saveEditor,
  closeEditor,
  onEditorChanged,
  onEditorSaved,
} from './bridge.js';

// Types
export type { EditorOpenResult } from './bridge.js';
