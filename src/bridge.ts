// ─── Editor Bridge ───
// Thin wrappers around omninet.run() for editor.* daemon operations.
// The daemon handles .idea persistence.
//
// Collaboration operations have moved to Vizier (Omny/vizier/).

// ─── Bridge Access ───

interface OmninetBridge {
  run(pipelineJson: string): Promise<{ ok: boolean; result?: unknown; error?: string } | string>;
  on(event: string, handler: (data: unknown) => void): void;
  off(event: string, handler: (data: unknown) => void): void;
}

const _bridge: OmninetBridge | undefined = typeof window !== 'undefined' ? window.omninet : undefined;
const _run = _bridge?.run?.bind(_bridge);
const _on = _bridge?.on?.bind(_bridge);
const _off = _bridge?.off?.bind(_bridge);

/** Run a single pipeline step against the daemon. */
async function runStep(op: string, input: Record<string, unknown>): Promise<unknown> {
  if (!_run) throw new Error('Omninet bridge not available');
  const raw = await _run(
    JSON.stringify({ source: 'editor', steps: [{ id: 'step', op, input }] }),
  );
  const result = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!result.ok) {
    throw new Error(result.error || `editor op "${op}" failed`);
  }
  return result.result;
}

// ─── Editor Operations ───

/** Open an editor session for an idea field. Returns initial markdown text. */
export async function openEditor(ideaId: string, field: string = 'body'): Promise<EditorOpenResult> {
  return (await runStep('editor.open', { id: ideaId, field })) as EditorOpenResult;
}

/** Send markdown content to the daemon for .idea persistence (debounced by caller). */
export async function setContent(
  ideaId: string,
  digitId: string,
  field: string,
  content: string,
): Promise<{ ok: boolean }> {
  return (await runStep('editor.set_content', {
    id: ideaId,
    digit_id: digitId,
    field,
    content,
  })) as { ok: boolean };
}

/** Save the current editor session to disk. */
export async function saveEditor(ideaId: string): Promise<void> {
  await runStep('editor.save', { id: ideaId });
}

/** Close the editor session (saves first). */
export async function closeEditor(ideaId: string): Promise<void> {
  await runStep('editor.close', { id: ideaId });
}

// ─── Events ───

/** Subscribe to editor.changed events. Returns unsubscribe function. */
export function onEditorChanged(handler: (data: { id: string }) => void): () => void {
  if (!_on || !_off) throw new Error('Omninet bridge not available');
  const wrapper = (data: unknown) => handler(data as { id: string });
  _on('editor.changed', wrapper);
  return () => _off('editor.changed', wrapper);
}

/** Subscribe to editor.saved events. Returns unsubscribe function. */
export function onEditorSaved(handler: (data: { id: string }) => void): () => void {
  if (!_on || !_off) throw new Error('Omninet bridge not available');
  const wrapper = (data: unknown) => handler(data as { id: string });
  _on('editor.saved', wrapper);
  return () => _off('editor.saved', wrapper);
}

// ─── Types ───

/** Result from editor.open — fields with their current markdown text. */
export interface EditorOpenResult {
  id: string;
  fields: Record<string, { field: string; text: string; type?: string }>;
}
