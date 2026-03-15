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

const DEBUG = true;
function log(...args) {
  if (DEBUG) console.log('[LabelPilot]', ...args);
}

function isPrimaryInboxMessage(meta) {
  if (!CONFIG.PRIMARY_ONLY) return true;
  const ids = meta.labelIds || [];
  if (!ids.includes('INBOX')) return false;
  return !CONFIG.NON_PRIMARY_CATEGORIES.some((cat) => ids.includes(cat));
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
 * Process a batch of message refs: label unlabeled Primary emails.
 * @param {Array} messages - Message refs from Gmail API
 * @param {Object} ctx - { labels, senderMappings, processedCount }
 * @returns {{ processedCount: number, tokenExpired: boolean, hitLimit: boolean }}
 */
async function processMessageBatch(messages, ctx) {
  let { processedCount } = ctx;
  let tokenExpired = false;
  let hitLimit = false;

  for (const msgRef of messages) {
    if (processedCount >= CONFIG.MAX_EMAILS_PER_CYCLE) {
      hitLimit = true;
      break;
    }
    const msgId = msgRef.id;

    try {
      const meta = await GmailClient.getMessageMetadata(msgId);
      if (!meta) continue;

      if (!isPrimaryInboxMessage(meta)) continue;

      const userLabels = meta.labelIds.filter((id) => !CONFIG.SYSTEM_LABELS.includes(id));
      if (userLabels.length > 0) continue;

      log('EMAIL_DETECTED', msgId, meta.subject);

      const result = await ClassifierEngine.classify(meta, ctx.labels, {
        senderMappings: ctx.senderMappings,
        threadLabelId: null,
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
      ctx.processedCount = processedCount;
    } catch (err) {
      log('Error processing', msgId, err.message);
      if (err.message?.includes('Token expired')) {
        GmailClient.clearToken();
        tokenExpired = true;
        break;
      }
    }
  }

  return { processedCount, tokenExpired, hitLimit };
}

/**
 * Scan inbox for unlabeled emails and process them.
 * Block-based: always check page 1 (new emails) first, then process current block (1-5, 6-10, ...) until fully labeled.
 */
async function scanInbox() {
  console.log('[LabelPilot] scanInbox started');
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

    const senderMappings = await StorageManager.getSenderMappings();
    const ctx = { labels, senderMappings, processedCount: 0 };
    const maxPages = CONFIG.MAX_PAGES_PER_BLOCK || 5;

    // Step 1: Always fetch page 1 (new emails) first
    const page1Res = await GmailClient.getMessages({
      maxResults: 20,
      q: CONFIG.INBOX_QUERY,
      pageToken: null,
    });
    console.log('[LabelPilot] Fetched page 1 (new emails):', page1Res.messages?.length || 0, 'messages');

    const batch1 = await processMessageBatch(page1Res.messages || [], ctx);
    if (batch1.tokenExpired) return;
    let blockComplete = !batch1.hitLimit;

    let nextBlockToken = await StorageManager.getNextBlockPageToken();

    // Step 2: Block processing
    if (nextBlockToken === null) {
      // Block 1: fetch pages 2-5 (page 1 already done)
      let pageToken = page1Res.nextPageToken;
      let pageCount = 1;

      while (pageToken && pageCount < maxPages && ctx.processedCount < CONFIG.MAX_EMAILS_PER_CYCLE) {
        const res = await GmailClient.getMessages({
          maxResults: 20,
          q: CONFIG.INBOX_QUERY,
          pageToken,
        });
        pageCount++;
        console.log('[LabelPilot] Fetched block 1 page', pageCount, ':', res.messages?.length || 0, 'messages');

        const batch = await processMessageBatch(res.messages || [], ctx);
        if (batch.tokenExpired) return;
        blockComplete = blockComplete && !batch.hitLimit;

        pageToken = res.nextPageToken;
      }

      // Block 1 done when we've fetched all 5 pages AND processed/skipped all (no limit hit)
      if (pageToken && pageCount >= maxPages && blockComplete) {
        await StorageManager.setNextBlockPageToken(pageToken);
        log('Block 1 complete, advancing to block 2');
      }
    } else {
      // Block 2+: fetch 5 pages from stored token
      let pageToken = nextBlockToken;
      let pageCount = 0;
      blockComplete = true;

      while (pageToken && pageCount < maxPages && ctx.processedCount < CONFIG.MAX_EMAILS_PER_CYCLE) {
        const res = await GmailClient.getMessages({
          maxResults: 20,
          q: CONFIG.INBOX_QUERY,
          pageToken,
        });
        pageCount++;
        console.log('[LabelPilot] Fetched block 2+ page', pageCount, ':', res.messages?.length || 0, 'messages');

        const batch = await processMessageBatch(res.messages || [], ctx);
        if (batch.tokenExpired) return;
        blockComplete = blockComplete && !batch.hitLimit;

        pageToken = res.nextPageToken;
      }

      // Block done when we've fetched all 5 pages AND processed/skipped all; store token for next block
      if (pageToken && pageCount >= maxPages && blockComplete) {
        await StorageManager.setNextBlockPageToken(pageToken);
        log('Block complete, advancing to next block');
      } else if (!pageToken) {
        await StorageManager.setNextBlockPageToken(null);
        log('Reached end of inbox');
      }
    }
  } catch (err) {
    console.error('[LabelPilot] scanInbox error:', err);
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
