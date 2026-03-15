/**
 * LabelPilot - Chrome built-in AI fallback via offscreen document
 * LanguageModel (Prompt API) runs in offscreen document; service worker delegates to it.
 */

const OFFSCREEN_PATH = 'offscreen/offscreen.html';
let _creatingOffscreen = null;

async function ensureOffscreenDocument() {
  const offscreenUrl = chrome.runtime.getURL(OFFSCREEN_PATH);
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [offscreenUrl],
  });
  if (contexts.length > 0) return;

  if (_creatingOffscreen) {
    await _creatingOffscreen;
    return;
  }
  _creatingOffscreen = chrome.offscreen.createDocument({
    url: OFFSCREEN_PATH,
    reasons: ['DOM_PARSER'],
    justification: 'Chrome built-in AI (Prompt API) for label classification',
  });
  await _creatingOffscreen;
  _creatingOffscreen = null;
}

const AIFallback = {
  /**
   * Use AI (via offscreen document) to select best label from candidates
   * @param {Object} email - { subject, from, fromEmail, snippet }
   * @param {Array} labels - [{ id, name }]
   * @returns {Promise<{id: string, name: string} | null>}
   */
  async selectLabel(email, labels) {
    if (!labels?.length) return null;

    try {
      await ensureOffscreenDocument();
      const response = await new Promise((resolve) => {
        const timeout = setTimeout(() => resolve({ ok: false, label: null }), 30000);
        chrome.runtime.sendMessage(
          { type: 'AI_SELECT_LABEL', email, labels },
          (r) => {
            clearTimeout(timeout);
            resolve(r || { ok: false, label: null });
          }
        );
      });
      return response?.ok && response?.label ? response.label : null;
    } catch (err) {
      console.warn('[LabelPilot] AI fallback failed:', err);
      return null;
    }
  },
};
