import { CONFIG } from '../config';
import type { AccountContext, AccountSummary, ActivityEvent, AppState, GmailLabel } from '../domain';
import { emptyState, isAppState } from './schema';

export class AccountStore {
  private async read(): Promise<AppState> {
    const result = await chrome.storage.local.get(CONFIG.storageKey);
    const value = result[CONFIG.storageKey];
    return isAppState(value) ? value : emptyState();
  }

  private async write(state: AppState): Promise<void> {
    await chrome.storage.local.set({ [CONFIG.storageKey]: state });
  }

  async list(): Promise<AccountSummary[]> {
    const state = await this.read();
    return Object.values(state.accounts).map(({ accountId, emailAddress, displayName, linkedAt }) => ({ accountId, emailAddress, ...(displayName ? { displayName } : {}), linkedAt }));
  }

  async getActive(): Promise<AccountContext | null> {
    const state = await this.read();
    return state.activeAccountId ? state.accounts[state.activeAccountId] ?? null : null;
  }

  async get(accountId: string): Promise<AccountContext | null> {
    return (await this.read()).accounts[accountId] ?? null;
  }

  async saveAccount(account: AccountContext, activate = true): Promise<void> {
    const state = await this.read();
    state.accounts[account.accountId] = account;
    if (activate) state.activeAccountId = account.accountId;
    await this.write(state);
  }

  async update(accountId: string, update: (account: AccountContext) => AccountContext): Promise<AccountContext> {
    const state = await this.read();
    const account = state.accounts[accountId];
    if (!account) throw new Error('Account is not linked');
    const next = update(account);
    state.accounts[accountId] = next;
    await this.write(state);
    return next;
  }

  async setActive(accountId: string): Promise<void> {
    const state = await this.read();
    if (!state.accounts[accountId]) throw new Error('Account is not linked');
    state.activeAccountId = accountId;
    await this.write(state);
  }

  async unlink(accountId: string): Promise<void> {
    const state = await this.read();
    delete state.accounts[accountId];
    if (state.activeAccountId === accountId) state.activeAccountId = Object.keys(state.accounts)[0] ?? null;
    await this.write(state);
  }

  async setLabels(accountId: string, labels: GmailLabel[]): Promise<void> {
    await this.update(accountId, (account) => ({ ...account, labels, lastLabelSyncAt: new Date().toISOString() }));
  }

  async addActivity(event: ActivityEvent): Promise<void> {
    if (!(await this.get(event.accountId))) throw new Error('Account is not linked');
    const key = `${CONFIG.storageKey}.activity.${event.accountId}`;
    const result = await chrome.storage.local.get(key);
    const events = Array.isArray(result[key]) ? (result[key] as ActivityEvent[]) : [];
    events.push(event);
    await chrome.storage.local.set({ [key]: events.slice(-CONFIG.activityLimit) });
  }

  async getActivity(accountId: string): Promise<ActivityEvent[]> {
    const key = `${CONFIG.storageKey}.activity.${accountId}`;
    const result = await chrome.storage.local.get(key);
    return Array.isArray(result[key]) ? (result[key] as ActivityEvent[]).slice().reverse() : [];
  }

  async resetAccount(accountId: string): Promise<void> {
    await this.unlink(accountId);
    await chrome.storage.local.remove(`${CONFIG.storageKey}.activity.${accountId}`);
  }

  async resetAll(): Promise<void> {
    const state = await this.read();
    const keys = Object.keys(state.accounts).map((id) => `${CONFIG.storageKey}.activity.${id}`);
    await chrome.storage.local.remove([CONFIG.storageKey, ...keys]);
  }
}
