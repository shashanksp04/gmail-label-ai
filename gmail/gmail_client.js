/**
 * LabelPilot - Gmail API client
 */

const GmailClient = {
  _accessToken: null,

  /**
   * Set access token (from Chrome Identity API)
   */
  setAccessToken(token) {
    this._accessToken = token;
  },

  /**
   * Get valid access token via Chrome Identity API
   */
  async getAccessToken() {
    if (this._accessToken) return this._accessToken;
    return new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive: false }, (token) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        this._accessToken = token;
        resolve(token);
      });
    });
  },

  /**
   * Request token with user interaction (for initial auth)
   */
  async getAccessTokenInteractive() {
    return new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive: true }, (token) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        this._accessToken = token;
        resolve(token);
      });
    });
  },

  /**
   * Clear invalid token
   */
  clearToken() {
    this._accessToken = null;
  },

  /**
   * Make authenticated request to Gmail API (with retry and exponential backoff)
   */
  async _request(url, options = {}, retries = 3) {
    const token = await this.getAccessToken();
    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };
    let lastErr;
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const res = await fetch(url, { ...options, headers });
        if (res.status === 401) {
          this.clearToken();
          chrome.identity.removeCachedAuthToken({ token }, () => {});
          throw new Error('Token expired');
        }
        if (res.status === 429 || res.status >= 500) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise((r) => setTimeout(r, delay));
          lastErr = new Error(`Gmail API error: ${res.status}`);
          continue;
        }
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error?.message || `Gmail API error: ${res.status}`);
        }
        const text = await res.text();
        return text ? JSON.parse(text) : {};
      } catch (err) {
        lastErr = err;
        if (err.message === 'Token expired' || attempt === retries - 1) throw err;
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((r) => setTimeout(r, delay));
      }
    }
    throw lastErr;
  },

  /**
   * Fetch user-created labels
   */
  async getLabels() {
    const url = `${CONFIG.GMAIL_API_BASE}/labels`;
    const data = await this._request(url);
    return GmailParser.parseLabels(data);
  },

  /**
   * Fetch messages from inbox
   * @param {Object} opts - { maxResults, pageToken, q }
   */
  async getMessages(opts = {}) {
    const { maxResults = 20, pageToken, q = CONFIG.INBOX_QUERY } = opts;
    let url = `${CONFIG.GMAIL_API_BASE}/messages?maxResults=${maxResults}&q=${encodeURIComponent(q)}`;
    if (pageToken) url += `&pageToken=${pageToken}`;
    const data = await this._request(url);
    return { messages: data.messages || [], nextPageToken: data.nextPageToken };
  },

  /**
   * Fetch message metadata (format=metadata)
   */
  async getMessageMetadata(messageId) {
    const url = `${CONFIG.GMAIL_API_BASE}/messages/${messageId}?format=metadata&metadataHeaders=Subject&metadataHeaders=From`;
    const message = await this._request(url);
    return GmailParser.parseMessageMetadata(message);
  },

  /**
   * Apply label to message
   */
  async applyLabel(messageId, labelId) {
    const url = `${CONFIG.GMAIL_API_BASE}/messages/${messageId}/modify`;
    await this._request(url, {
      method: 'POST',
      body: JSON.stringify({ addLabelIds: [labelId] }),
    });
  },
};
