import { TEXT_OPTIONS } from '../config';

const $ = (id: string) => document.getElementById(id)!;
type PopupResponse = { ok: boolean; accounts?: Array<{ accountId: string; emailAddress: string }>; active?: typeof active; activity?: Array<{ timestamp: string; step: string; outcome: string; messageId?: string }> };
const call = (message: object) => chrome.runtime.sendMessage(message) as Promise<PopupResponse>;
let active: { accountId: string; emailAddress: string; settings?: { automationEnabled: boolean } } | null = null;

async function checkAI(): Promise<void> {
  const status = $('aiStatus');
  const api = (globalThis as typeof globalThis & { LanguageModel?: { availability(options: unknown): Promise<string> } }).LanguageModel;
  if (!api) { status.textContent = 'AI: unsupported'; return; }
  try { status.textContent = `AI: ${await api.availability(TEXT_OPTIONS)}`; } catch { status.textContent = 'AI: unavailable'; }
}

async function refresh(): Promise<void> {
  const response = await call({ type: 'LIST_ACCOUNTS' });
  const select = $('accounts') as HTMLSelectElement;
  const list = response.accounts ?? [];
  select.replaceChildren(...list.map((account: { accountId: string; emailAddress: string }) => { const option = document.createElement('option'); option.value = account.accountId; option.textContent = account.emailAddress; return option; }));
  active = response.active ?? null;
  const linked = Boolean(active);
  $('link').hidden = linked;
  select.hidden = !linked;
  for (const control of ['switch', 'initialize', 'preview', 'automation', 'refresh', 'unlink']) $(control).hidden = !linked;
  if (active) { select.value = active.accountId; $('status').textContent = `Connected: ${active.emailAddress}`; $('automation').textContent = active.settings?.automationEnabled ? 'Disable automation' : 'Enable automation'; await loadActivity(); }
}

async function loadActivity(): Promise<void> { if (!active) return; const response = await call({ type: 'GET_ACTIVITY', accountId: active.accountId }); $('activity').innerHTML = (response.activity ?? []).slice(0, 30).map((item: { timestamp: string; step: string; outcome: string; messageId?: string }) => `<div>${new Date(item.timestamp).toLocaleTimeString()} — ${item.step} — ${item.outcome}${item.messageId ? ` — ${item.messageId}` : ''}</div>`).join('') || 'No activity'; }

$('link').addEventListener('click', async () => { $('link').textContent = 'Linking…'; const response = await call({ type: 'LINK_ACCOUNT' }); $('link').textContent = response.ok ? 'Linked' : 'Link failed'; await refresh(); });
$('switch').addEventListener('click', async () => { await call({ type: 'SWITCH_ACCOUNT', accountId: ($('accounts') as HTMLSelectElement).value }); await refresh(); });
$('unlink').addEventListener('click', async () => { if (active && confirm(`Unlink ${active.emailAddress}?`)) { await call({ type: 'UNLINK_ACCOUNT', accountId: active.accountId }); await refresh(); } });
$('preview').addEventListener('click', async () => { await call({ type: 'PREVIEW_SCAN' }); await loadActivity(); });
$('refresh').addEventListener('click', async () => { await call({ type: 'REFRESH_LABELS' }); await loadActivity(); });
$('automation').addEventListener('click', async () => { if (!active) return; const enabled = !active.settings?.automationEnabled; await call({ type: 'SET_AUTOMATION', accountId: active.accountId, enabled }); await refresh(); });
$('initialize').addEventListener('click', async () => { const status = $('aiStatus'); try { const api = (globalThis as typeof globalThis & { LanguageModel?: { create(options: unknown): Promise<{ destroy?: () => void }>; availability(options: unknown): Promise<string> } }).LanguageModel; if (!api) throw new Error('Prompt API is unavailable'); const availability = await api.availability(TEXT_OPTIONS); status.textContent = `AI: ${availability}`; if (availability === 'downloadable' || availability === 'available') { const session = await api.create(TEXT_OPTIONS); session.destroy?.(); status.textContent = 'AI: ready'; } } catch (error) { status.textContent = `AI: ${error instanceof Error ? error.message : 'failed'}`; } });

void Promise.all([refresh(), checkAI()]);
