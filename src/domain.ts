export interface GmailLabel {
  id: string;
  name: string;
  normalizedName: string;
}

export interface EmailMetadata {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  fromEmail: string;
  snippet: string;
  labelIds: string[];
}

export interface AccountSummary {
  accountId: string;
  emailAddress: string;
  displayName?: string;
  linkedAt: string;
}

export interface AccountContext extends AccountSummary {
  labels: GmailLabel[];
  senderMappings: Record<string, string>;
  pagination: { nextBlockPageToken: string | null };
  settings: {
    automationEnabled: boolean;
    primaryInboxOnly: boolean;
    aiEnabled: boolean;
  };
  lastLabelSyncAt: string | null;
}

export interface AppState {
  schemaVersion: 2;
  activeAccountId: string | null;
  accounts: Record<string, AccountContext>;
}

export interface ClassificationResult {
  decision: 'label' | 'skip';
  labelId: string | null;
  confidence: number | null;
  source: 'deterministic' | 'ai' | 'none';
  reason: string;
}

export interface ActivityEvent {
  id: string;
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  accountId: string;
  runId?: string;
  messageId?: string;
  step: string;
  outcome: 'started' | 'succeeded' | 'skipped' | 'failed';
  durationMs?: number;
  errorName?: string;
  errorMessage?: string;
  metadata?: Record<string, string | number | boolean | null>;
}
