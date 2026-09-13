import type { AppState, AccountContext } from '../domain';

export const emptyState = (): AppState => ({ schemaVersion: 2, activeAccountId: null, accounts: {} });

export function isAppState(value: unknown): value is AppState {
  const state = value as Partial<AppState> | null;
  return Boolean(state && state.schemaVersion === 2 && state.accounts && typeof state.accounts === 'object');
}

export function createAccount(accountId: string, emailAddress: string, displayName?: string): AccountContext {
  return {
    accountId,
    emailAddress,
    ...(displayName ? { displayName } : {}),
    linkedAt: new Date().toISOString(),
    labels: [],
    senderMappings: {},
    pagination: { nextBlockPageToken: null },
    settings: { automationEnabled: false, primaryInboxOnly: true, aiEnabled: true },
    lastLabelSyncAt: null,
  };
}
