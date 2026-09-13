import { CONFIG } from '../config';

export interface GmailProfile { emailAddress: string; historyId?: string; messagesTotal?: number; threadsTotal?: number }
export interface MessagePage { messages: Array<{ id: string; threadId?: string }>; nextPageToken?: string }

export class GmailError extends Error {
  constructor(public readonly code: 'authentication' | 'authorization' | 'rate_limit' | 'network' | 'not_found' | 'server' | 'invalid_request' | 'unknown', message: string, public readonly status?: number) {
    super(message);
    this.name = 'GmailError';
  }
}

export class GmailClient {
  constructor(private readonly getToken: () => Promise<string>) {}

  async getProfile(): Promise<GmailProfile> { return this.request<GmailProfile>('/profile'); }
  async listLabels(): Promise<unknown> { return this.request('/labels'); }
  async listMessages(maxResults = 20, pageToken?: string): Promise<MessagePage> {
    const query = new URLSearchParams({ maxResults: String(maxResults), q: CONFIG.inboxQuery });
    if (pageToken) query.set('pageToken', pageToken);
    return this.request<MessagePage>(`/messages?${query}`);
  }
  async getMessageMetadata(id: string): Promise<unknown> { return this.request(`/messages/${encodeURIComponent(id)}?format=metadata&metadataHeaders=Subject&metadataHeaders=From`); }
  async applyLabel(messageId: string, labelId: string): Promise<void> {
    await this.request(`/messages/${encodeURIComponent(messageId)}/modify`, { method: 'POST', body: JSON.stringify({ addLabelIds: [labelId] }) });
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    let lastError: GmailError | undefined;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const token = await this.getToken();
        const response = await fetch(`${CONFIG.gmailApiBase}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...init.headers } });
        if (response.ok) {
          const text = await response.text();
          return (text ? JSON.parse(text) : {}) as T;
        }
        const body = await response.json().catch(() => ({})) as { error?: { message?: string } };
        const code = response.status === 401 ? 'authentication' : response.status === 403 ? 'authorization' : response.status === 404 ? 'not_found' : response.status === 429 ? 'rate_limit' : response.status >= 500 ? 'server' : 'invalid_request';
        lastError = new GmailError(code, body.error?.message ?? `Gmail API error (${response.status})`, response.status);
        if (!['rate_limit', 'server'].includes(code)) throw lastError;
      } catch (error) {
        if (error instanceof GmailError) { lastError = error; if (!['rate_limit', 'server'].includes(error.code)) throw error; }
        else lastError = new GmailError('network', error instanceof Error ? error.message : 'Network request failed');
      }
      await new Promise((resolve) => setTimeout(resolve, 2 ** attempt * 500));
    }
    throw lastError ?? new GmailError('unknown', 'Gmail request failed');
  }
}
