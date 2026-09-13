import { GmailClient } from '../gmail/gmail-client';
import { parseLabels } from '../gmail/gmail-parser';
import { AccountStore } from '../storage/account-store';
import { createAccount } from '../storage/schema';
import { TokenManager } from './token-manager';
import type { AccountContext, AccountSummary } from '../domain';

export class AccountManager {
  constructor(private readonly store = new AccountStore(), private readonly tokens = new TokenManager()) {}

  async link(): Promise<AccountContext> {
    const temporaryToken = await this.tokens.get('pending', true);
    const client = new GmailClient(async () => temporaryToken);
    const profile = await client.getProfile();
    const accountId = profile.emailAddress.toLowerCase();
    this.tokens.clear('pending');
    this.tokens.clear(accountId);
    this.tokens.adopt(accountId, temporaryToken);
    const existing = await this.store.get(accountId);
    const account = existing ?? createAccount(accountId, profile.emailAddress);
    const labels = parseLabels(await client.listLabels());
    account.labels = labels;
    account.lastLabelSyncAt = new Date().toISOString();
    await this.store.saveAccount(account, true);
    return account;
  }

  async switch(accountId: string): Promise<AccountContext> {
    const account = await this.store.get(accountId);
    if (!account) throw new Error('Account is not linked');
    const token = await this.tokens.get(accountId, true);
    const profile = await new GmailClient(async () => token).getProfile();
    if (profile.emailAddress.toLowerCase() !== account.emailAddress.toLowerCase()) {
      throw new Error(`Google returned ${profile.emailAddress}; select ${account.emailAddress} and try again`);
    }
    await this.store.setActive(accountId);
    return account;
  }

  async unlink(accountId: string): Promise<void> {
    await this.tokens.clearCached(accountId);
    await this.store.resetAccount(accountId);
  }

  list(): Promise<AccountSummary[]> { return this.store.list(); }
  active(): Promise<AccountContext | null> { return this.store.getActive(); }
  client(accountId: string): GmailClient { return new GmailClient(() => this.tokens.get(accountId)); }
  tokenManager(): TokenManager { return this.tokens; }
  storeInstance(): AccountStore { return this.store; }
}
