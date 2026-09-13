import { CONFIG } from '../config';
import type { AccountContext } from '../domain';
import { AccountManager } from '../auth/account-manager';
import { parseLabels, parseMessageMetadata } from '../gmail/gmail-parser';
import { Classifier } from '../classification/ai-classifier';
import { OffscreenAIClient } from '../ai/offscreen-client';
import { Logger } from '../logging/logger';
import { extractDomain, id } from '../utils';

const accounts = new AccountManager();
const store = accounts.storeInstance();
const logger = new Logger(store);
const classifier = new Classifier(new OffscreenAIClient());
let running: Promise<void> | null = null;

async function event(accountId: string, runId: string, step: string, outcome: 'started' | 'succeeded' | 'skipped' | 'failed', metadata?: Record<string, string | number | boolean | null>, error?: unknown, messageId?: string): Promise<void> {
  const err = error as Error | undefined;
  await logger.write({ accountId, runId, messageId, step, outcome, level: outcome === 'failed' ? 'error' : outcome === 'skipped' ? 'warn' : 'info', ...(metadata ? { metadata } : {}), ...(err ? { errorName: err.name, errorMessage: err.message } : {}) });
}

async function scan(account: AccountContext, mode: 'preview' | 'automatic', source: string): Promise<void> {
  const runId = id();
  await event(account.accountId, runId, 'scan', 'started', { mode, source });
  const client = accounts.client(account.accountId);
  let processed = 0;
  try {
    const profile = await client.getProfile();
    if (profile.emailAddress.toLowerCase() !== account.emailAddress.toLowerCase()) {
      throw new Error(`Selected Gmail token belongs to ${profile.emailAddress}, not ${account.emailAddress}`);
    }
    const firstPage = await client.listMessages(20);
    const pages = [firstPage];
    let nextPageToken = account.pagination.nextBlockPageToken ?? firstPage.nextPageToken;
    while (nextPageToken && pages.length < CONFIG.maxPagesPerBlock) {
      const nextPage = await client.listMessages(20, nextPageToken);
      pages.push(nextPage);
      nextPageToken = nextPage.nextPageToken;
    }
    let complete = processed < CONFIG.maxEmailsPerCycle;
    for (const page of pages) for (const reference of page.messages) {
      if (processed >= CONFIG.maxEmailsPerCycle) { complete = false; break; }
      const raw = await client.getMessageMetadata(reference.id);
      const email = parseMessageMetadata(raw);
      if (!email) { await event(account.accountId, runId, 'metadata', 'skipped', { reason: 'Invalid Gmail metadata' }, undefined, reference.id); continue; }
      if (!email.labelIds.includes('INBOX') || (account.settings.primaryInboxOnly && email.labelIds.some((label) => CONFIG.nonPrimaryCategories.has(label)))) {
        await event(account.accountId, runId, 'eligibility', 'skipped', { reason: 'Not an eligible inbox message' }, undefined, email.id); continue;
      }
      if (email.labelIds.some((label) => !CONFIG.systemLabels.has(label))) {
        await event(account.accountId, runId, 'eligibility', 'skipped', { reason: 'Already has a user label' }, undefined, email.id); continue;
      }
      const result = await classifier.classify(email, account.labels, account.senderMappings);
      if (result.decision === 'skip' || !result.labelId) {
        await event(account.accountId, runId, 'classification', 'skipped', { source: result.source, reason: result.reason }, undefined, email.id);
      } else if (mode === 'preview') {
        await event(account.accountId, runId, 'classification', 'succeeded', { source: result.source, labelId: result.labelId, confidence: result.confidence ?? -1, preview: true }, undefined, email.id);
      } else {
        await client.applyLabel(email.id, result.labelId);
        const domain = extractDomain(email.fromEmail);
        if (domain && !CONFIG.excludedMappingDomains.has(domain)) {
          await accounts.storeInstance().update(account.accountId, (current) => ({ ...current, senderMappings: { ...current.senderMappings, [domain]: result.labelId! } }));
        }
        await event(account.accountId, runId, 'label-application', 'succeeded', { source: result.source, labelId: result.labelId, confidence: result.confidence ?? -1 }, undefined, email.id);
      }
      processed++;
    }
    if (complete) await store.update(account.accountId, (current) => ({ ...current, pagination: { nextBlockPageToken: nextPageToken ?? null } }));
    await event(account.accountId, runId, 'scan', 'succeeded', { processed });
  } catch (error) {
    await event(account.accountId, runId, 'scan', 'failed', { processed }, error);
  }
}

async function runScan(mode: 'preview' | 'automatic', source: string): Promise<void> {
  if (running) return;
  const account = await accounts.active();
  if (!account) return;
  if (mode === 'automatic' && !account.settings.automationEnabled) return;
  running = scan(account, mode, source).finally(() => { running = null; });
  await running;
}

chrome.runtime.onInstalled.addListener(() => { chrome.alarms.create(CONFIG.alarmName, { periodInMinutes: CONFIG.pollIntervalMinutes }); });
chrome.runtime.onStartup.addListener(() => { chrome.alarms.create(CONFIG.alarmName, { periodInMinutes: CONFIG.pollIntervalMinutes }); });
chrome.alarms.onAlarm.addListener((alarm) => { if (alarm.name === CONFIG.alarmName) void runScan('automatic', 'alarm'); });

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  const request = message as { type?: string; accountId?: string; mode?: 'preview' | 'automatic' };
  void (async () => {
    try {
      switch (request.type) {
        case 'LINK_ACCOUNT': sendResponse({ ok: true, account: await accounts.link() }); return;
        case 'LIST_ACCOUNTS': sendResponse({ ok: true, accounts: await accounts.list(), active: await accounts.active() }); return;
        case 'SWITCH_ACCOUNT': sendResponse({ ok: true, account: await accounts.switch(request.accountId!) }); return;
        case 'UNLINK_ACCOUNT': await accounts.unlink(request.accountId!); sendResponse({ ok: true }); return;
        case 'PREVIEW_SCAN': await runScan('preview', 'manual'); sendResponse({ ok: true }); return;
        case 'SCAN_NOW': await runScan(request.mode ?? 'automatic', 'manual'); sendResponse({ ok: true }); return;
        case 'GET_ACTIVITY': sendResponse({ ok: true, activity: await store.getActivity(request.accountId!) }); return;
        case 'SET_AUTOMATION': {
          const account = await store.update(request.accountId!, (current) => ({ ...current, settings: { ...current.settings, automationEnabled: Boolean((message as { enabled?: boolean }).enabled) } }));
          sendResponse({ ok: true, account }); return;
        }
        case 'REFRESH_LABELS': {
          const account = await accounts.active(); if (!account) throw new Error('No active account');
          const labels = parseLabels(await accounts.client(account.accountId).listLabels());
          await store.setLabels(account.accountId, labels); sendResponse({ ok: true, labels }); return;
        }
        case 'RESET_ALL': await store.resetAll(); sendResponse({ ok: true }); return;
        default: sendResponse({ ok: false, error: 'Unknown message' });
      }
    } catch (error) { sendResponse({ ok: false, error: error instanceof Error ? error.message : 'Operation failed' }); }
  })();
  return true;
});
