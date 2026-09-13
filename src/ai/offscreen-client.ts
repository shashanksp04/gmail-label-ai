import { CONFIG, TEXT_OPTIONS } from '../config';
import type { EmailMetadata, GmailLabel } from '../domain';
import type { AIClient } from '../classification/ai-classifier';

const path = 'src/ai/offscreen.html';
let creating: Promise<void> | null = null;

async function ensureDocument(): Promise<void> {
  const url = chrome.runtime.getURL(path);
  const getContexts = chrome.runtime.getContexts as unknown as (filter: unknown) => Promise<Array<unknown>>;
  const contexts = await getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'], documentUrls: [url] });
  if (contexts.length) return;
  const createDocument = chrome.offscreen.createDocument as unknown as (options: { url: string; reasons: string[]; justification: string }) => Promise<void>;
  creating ??= createDocument({ url: path, reasons: ['IFRAME_SCRIPTING'], justification: 'Run Chrome built-in AI in a document context' });
  try { await creating; } finally { creating = null; }
}

export class OffscreenAIClient implements AIClient {
  async initialize(): Promise<string> {
    if (!('LanguageModel' in globalThis)) return 'unsupported';
    const availability = await (globalThis as typeof globalThis & { LanguageModel: { availability(options: unknown): Promise<string> } }).LanguageModel.availability(TEXT_OPTIONS);
    if (availability !== 'available') return availability;
    await ensureDocument();
    return 'available';
  }

  async selectLabel(email: EmailMetadata, labels: GmailLabel[]): Promise<string | null> {
    if (!labels.length) return null;
    await ensureDocument();
    const requestId = crypto.randomUUID();
    return new Promise((resolve) => {
      const timeout = setTimeout(() => { chrome.runtime.onMessage.removeListener(listener); resolve(null); }, 30000);
      const listener = (message: unknown): void => {
        const response = message as { type?: string; requestId?: string; labelId?: string | null };
        if (response.type !== 'AI_RESULT' || response.requestId !== requestId) return;
        clearTimeout(timeout);
        chrome.runtime.onMessage.removeListener(listener);
        resolve(response.labelId ?? null);
      };
      chrome.runtime.onMessage.addListener(listener);
      void chrome.runtime.sendMessage({ type: 'AI_SELECT_LABEL', requestId, email, labels, options: TEXT_OPTIONS }).then((response: { type?: string; requestId?: string; labelId?: string | null } | undefined) => {
        if (response?.type !== 'AI_RESULT' || response.requestId !== requestId) return;
        clearTimeout(timeout);
        chrome.runtime.onMessage.removeListener(listener);
        resolve(response.labelId ?? null);
      }).catch(() => { clearTimeout(timeout); chrome.runtime.onMessage.removeListener(listener); resolve(null); });
    });
  }
}

export const aiOptions = CONFIG;
