/**
 * LabelPilot - Storage manager for chrome.storage.local
 */

const StorageManager = {
  /**
   * Get sender-label mappings { sender_domain: label_id }
   */
  async getSenderMappings() {
    const result = await chrome.storage.local.get(CONFIG.STORAGE_KEYS.SENDER_MAPPINGS);
    return result[CONFIG.STORAGE_KEYS.SENDER_MAPPINGS] || {};
  },

  /**
   * Save sender-label mapping
   */
  async addSenderMapping(senderDomain, labelId) {
    const mappings = await this.getSenderMappings();
    mappings[senderDomain] = labelId;
    await chrome.storage.local.set({ [CONFIG.STORAGE_KEYS.SENDER_MAPPINGS]: mappings });
  },

  /**
   * Get cached labels
   */
  async getCachedLabels() {
    const result = await chrome.storage.local.get(CONFIG.STORAGE_KEYS.CACHED_LABELS);
    return result[CONFIG.STORAGE_KEYS.CACHED_LABELS] || null;
  },

  /**
   * Cache labels
   */
  async setCachedLabels(labels) {
    await chrome.storage.local.set({ [CONFIG.STORAGE_KEYS.CACHED_LABELS]: labels });
  },

  /**
   * Get last processed message ID
   */
  async getLastProcessedId() {
    const result = await chrome.storage.local.get(CONFIG.STORAGE_KEYS.LAST_PROCESSED_ID);
    return result[CONFIG.STORAGE_KEYS.LAST_PROCESSED_ID] || null;
  },

  /**
   * Set last processed message ID
   */
  async setLastProcessedId(messageId) {
    await chrome.storage.local.set({ [CONFIG.STORAGE_KEYS.LAST_PROCESSED_ID]: messageId });
  },

  /**
   * Get page token for next block (pages 6-10, 11-15, etc.)
   */
  async getNextBlockPageToken() {
    const result = await chrome.storage.local.get(CONFIG.STORAGE_KEYS.NEXT_BLOCK_PAGE_TOKEN);
    return result[CONFIG.STORAGE_KEYS.NEXT_BLOCK_PAGE_TOKEN] || null;
  },

  /**
   * Set page token for next block
   */
  async setNextBlockPageToken(token) {
    if (token) {
      await chrome.storage.local.set({ [CONFIG.STORAGE_KEYS.NEXT_BLOCK_PAGE_TOKEN]: token });
    } else {
      await chrome.storage.local.remove(CONFIG.STORAGE_KEYS.NEXT_BLOCK_PAGE_TOKEN);
    }
  },

  /**
   * Get auth status
   */
  async getAuthStatus() {
    const result = await chrome.storage.local.get(CONFIG.STORAGE_KEYS.AUTH_STATUS);
    return result[CONFIG.STORAGE_KEYS.AUTH_STATUS] || 'unknown';
  },

  /**
   * Set auth status
   */
  async setAuthStatus(status) {
    await chrome.storage.local.set({ [CONFIG.STORAGE_KEYS.AUTH_STATUS]: status });
  },

  /**
   * Get debug mode
   */
  async getDebugMode() {
    const result = await chrome.storage.local.get(CONFIG.STORAGE_KEYS.DEBUG_MODE);
    return result[CONFIG.STORAGE_KEYS.DEBUG_MODE] || false;
  },

  /**
   * Get mappings formatted for display: [{ domain, labelId, labelName }]
   */
  async getMappingsForDisplay() {
    const mappings = await this.getSenderMappings();
    const labels = await this.getCachedLabels();
    const labelMap = new Map((labels || []).map((l) => [l.id, l.name]));
    return Object.entries(mappings).map(([domain, labelId]) => ({
      domain,
      labelId,
      labelName: labelMap.get(labelId) || '(unknown)',
    }));
  },

  /**
   * Remove a sender mapping by domain
   */
  async removeSenderMapping(domain) {
    const mappings = await this.getSenderMappings();
    delete mappings[domain];
    await chrome.storage.local.set({ [CONFIG.STORAGE_KEYS.SENDER_MAPPINGS]: mappings });
  },

  /**
   * Clear all sender mappings
   */
  async clearAllSenderMappings() {
    await chrome.storage.local.set({ [CONFIG.STORAGE_KEYS.SENDER_MAPPINGS]: {} });
  },
};
