export class TokenManager {
  private tokens = new Map<string, string>();

  async get(accountId: string, interactive = false): Promise<string> {
    const cached = this.tokens.get(accountId);
    if (cached) return cached;
    return new Promise((resolve, reject) => {
      // Chrome's account selector exposes opaque account IDs, not email addresses.
      // We deliberately omit `account` here; the selected OAuth token is verified
      // against Gmail's profile before a scan is allowed to mutate messages.
      chrome.identity.getAuthToken({ interactive }, (token) => {
        if (chrome.runtime.lastError || !token) { reject(new Error(chrome.runtime.lastError?.message ?? 'Gmail authentication failed')); return; }
        this.tokens.set(accountId, token);
        resolve(token);
      });
    });
  }

  clear(accountId: string): void { this.tokens.delete(accountId); }
  adopt(accountId: string, token: string): void { this.tokens.set(accountId, token); }
  async clearCached(accountId: string): Promise<void> {
    const token = this.tokens.get(accountId);
    this.clear(accountId);
    if (token) await new Promise<void>((resolve) => chrome.identity.removeCachedAuthToken({ token }, () => resolve()));
  }
}
