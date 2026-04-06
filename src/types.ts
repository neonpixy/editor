// ─── Editor Types ───
// Mirrors the daemon's editor_mod.rs wire format.
// TipTap owns the document model; these types cover daemon I/O only.

// Re-export the EditorOpenResult from bridge (single source of truth).
export type { EditorOpenResult } from './bridge.js';
