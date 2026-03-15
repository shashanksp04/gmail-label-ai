/**
 * LabelPilot - Background service worker
 * Loads all modules via importScripts and runs the email processing pipeline.
 */

importScripts(
  '../config/constants.js',
  '../utils/text_utils.js',
  '../storage/storage_manager.js',
  '../gmail/gmail_parser.js',
  '../gmail/gmail_client.js',
  '../classifier/deterministic_matcher.js',
  '../classifier/ai_fallback.js',
  '../classifier/classifier_engine.js'
);

const DEBUG = false;
function log(...args) {
  if (DEBUG) console.log('[LabelPilot]', ...args);
}

/**
 * Get access token (interactive for first auth)
 */
async function ensureAuth() {
  try {
    await GmailClient.getAccessToken();
    await StorageManager.setAuthStatus('authenticated');
    return true;
  } catch (err) {
    log('Auth failed (non-interactive):', err.message);
    await StorageManager.setAuthStatus('needs_auth');
    return false;
  }
}

/**
 * Scan inbox for unlabeled emails and process them
 */
async function scanInbox() {
  const authed = await ensureAuth();
  if (!authed) {
    log('Skipping scan: not authenticated');
    return;
  }

  try {
    let labels = await StorageManager.getCachedLabels();
    if (!labels?.length) {
      labels = await GmailClient.getLabels();
      await StorageManager.setCachedLabels(labels);
    }
    if (!labels?.length) {
      log('No user labels found');
      return;
    }

    const { messages } = await GmailClient.getMessages({
      maxResults: CONFIG.MAX_EMAILS_PER_CYCLE * 2,
      q: CONFIG.INBOX_QUERY,
    });

    const senderMappings = await StorageManager.getSenderMappings();
    const lastProcessedId = await StorageManager.getLastProcessedId();
    let processedCount = 0;
    let latestId = lastProcessedId;

    for (const msgRef of messages) {
      if (processedCount >= CONFIG.MAX_EMAILS_PER_CYCLE) break;
      const msgId = msgRef.id;

      try {
        const meta = await GmailClient.getMessageMetadata(msgId);
        if (!meta) continue;

        // Skip if already has user labels (exclude system labels)
        const userLabels = meta.labelIds.filter((id) => !CONFIG.SYSTEM_LABELS.includes(id));
        if (userLabels.length > 0) {
          latestId = msgId;
          continue;
        }

        log('EMAIL_DETECTED', msgId, meta.subject);

        const result = await ClassifierEngine.classify(meta, labels, {
          senderMappings,
          threadLabelId: null, // TODO: fetch thread labels if needed
        });

        if (result) {
          log('LABEL_SELECTED', result.labelName, 'for', msgId);
          await GmailClient.applyLabel(msgId, result.labelId);
          log('LABEL_APPLIED', result.labelName);

          const domain = extractDomain(meta.fromEmail);
          const excluded = CONFIG.EXCLUDED_SENDER_MAPPING_DOMAINS || [];
          if (domain && !excluded.includes(domain)) {
            await StorageManager.addSenderMapping(domain, result.labelId);
          }
        }

        processedCount++;
        latestId = msgId;
      } catch (err) {
        log('Error processing', msgId, err.message);
        if (err.message?.includes('Token expired')) {
          GmailClient.clearToken();
          break;
        }
      }
    }

    if (latestId) {
      await StorageManager.setLastProcessedId(latestId);
    }
  } catch (err) {
    log('scanInbox error:', err);
    if (err.message?.includes('Token')) {
      await StorageManager.setAuthStatus('needs_auth');
    }
  }
}

/**
 * Setup polling alarm
 */
function setupAlarm() {
  chrome.alarms.create(CONFIG.ALARM_NAME, {
    periodInMinutes: CONFIG.POLL_INTERVAL_MINUTES,
  });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === CONFIG.ALARM_NAME) {
    scanInbox();
  }
});

chrome.runtime.onInstalled.addListener(() => {
  setupAlarm();
  scanInbox();
});

chrome.runtime.onStartup.addListener(() => {
  setupAlarm();
  scanInbox();
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'AUTH_REQUEST') {
    GmailClient.getAccessTokenInteractive()
      .then(() => {
        StorageManager.setAuthStatus('authenticated');
        scanInbox();
        sendResponse({ ok: true });
      })
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true; // async response
  }
  if (msg.type === 'SCAN_NOW') {
    scanInbox().then(() => sendResponse({ ok: true })).catch((e) => sendResponse({ ok: false, error: e.message }));
    return true;
  }
  if (msg.type === 'GET_STATUS') {
    StorageManager.getAuthStatus().then((status) => sendResponse({ status }));
    return true;
  }
  if (msg.type === 'GET_MAPPINGS') {
    StorageManager.getMappingsForDisplay().then((mappings) => sendResponse({ mappings }));
    return true;
  }
  if (msg.type === 'REMOVE_MAPPING') {
    StorageManager.removeSenderMapping(msg.domain)
      .then(() => sendResponse({ ok: true }))
      .catch((e) => sendResponse({ ok: false, error: e.message }));
    return true;
  }
  if (msg.type === 'CLEAR_MAPPINGS') {
    StorageManager.clearAllSenderMappings()
      .then(() => sendResponse({ ok: true }))
      .catch((e) => sendResponse({ ok: false, error: e.message }));
    return true;
  }
});
