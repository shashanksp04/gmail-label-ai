/**
 * LabelPilot - Offscreen document for Chrome built-in AI
 * Runs in document context where LanguageModel (Prompt API) is available.
 */

function normalizeText(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type !== 'AI_SELECT_LABEL') return false;

  const { email, labels } = msg;
  if (!labels?.length) {
    sendResponse({ ok: false, label: null });
    return false;
  }

  (async () => {
    try {
      if (typeof LanguageModel === 'undefined') {
        sendResponse({ ok: false, label: null });
        return;
      }
      const modelOptions = { expectedOutputs: [{ type: 'text', languages: ['en'] }] };
      const availability = await LanguageModel.availability?.(modelOptions);
      const usable = ['readily', 'after-download', 'available', 'downloadable'].includes(availability);
      if (!usable) {
        sendResponse({ ok: false, label: null });
        return;
      }

      const labelNames = labels.map((l) => l.name).join(', ');
      const prompt = `Email Subject: ${email.subject || '(no subject)'}
Sender: ${email.from || email.fromEmail || 'unknown'}
Snippet: ${(email.snippet || '').slice(0, 200)}

Choose the most appropriate label from this exact list: ${labelNames}

Return ONLY the label name, nothing else.`;

      const session = await LanguageModel.create(modelOptions);
      const response = await session.prompt([{ role: 'user', content: prompt }]);
      const chosenName = (response || '').trim().replace(/^["']|["']$/g, '');
      const match = labels.find((l) => normalizeText(l.name) === normalizeText(chosenName));

      sendResponse({ ok: true, label: match || null });
    } catch (err) {
      console.warn('[LabelPilot] AI failed:', err);
      sendResponse({ ok: false, label: null });
    }
  })();

  return true; // async response
});
