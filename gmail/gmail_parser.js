/**
 * LabelPilot - Parse Gmail API responses into structured metadata
 */

const GmailParser = {
  /**
   * Parse message metadata from Gmail API response
   * @param {Object} message - Gmail API message object
   * @returns {Object} { id, threadId, subject, from, fromEmail, snippet, labelIds }
   */
  parseMessageMetadata(message) {
    if (!message || !message.id) return null;

    const headers = message.payload?.headers || [];
    const getHeader = (name) => {
      const h = headers.find((x) => x.name?.toLowerCase() === name?.toLowerCase());
      return h?.value || '';
    };

    const fromRaw = getHeader('From');
    const { email: fromEmail, name: fromName } = this.parseFromHeader(fromRaw);

    return {
      id: message.id,
      threadId: message.threadId,
      subject: getHeader('Subject'),
      from: fromName || fromEmail,
      fromEmail,
      snippet: message.snippet || '',
      labelIds: message.labelIds || [],
    };
  },

  /**
   * Parse "From" header (e.g., "AlphaSignal <newsletter@alphasignal.ai>" or "news@tldr.com")
   */
  parseFromHeader(fromHeader) {
    if (!fromHeader || typeof fromHeader !== 'string') {
      return { email: '', name: '' };
    }
    const match = fromHeader.match(/^(.+?)\s*<([^>]+)>$/);
    if (match) {
      return { name: match[1].trim().replace(/^["']|["']$/g, ''), email: match[2].trim() };
    }
    return { email: fromHeader.trim(), name: '' };
  },

  /**
   * Parse labels list from Gmail API
   * @param {Object} labelsResponse - Gmail API labels list response
   * @returns {Array} User-created labels with id, name, normalizedName
   */
  parseLabels(labelsResponse) {
    const labels = labelsResponse?.labels || [];
    return labels
      .filter((l) => l.id && !CONFIG.SYSTEM_LABELS.includes(l.id))
      .map((l) => ({
        id: l.id,
        name: l.name || '',
        normalizedName: normalizeText(l.name || ''),
      }));
  },
};
