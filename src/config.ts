export const CONFIG = {
  gmailApiBase: 'https://gmail.googleapis.com/gmail/v1/users/me',
  inboxQuery: 'in:inbox',
  pollIntervalMinutes: 2,
  alarmName: 'labelpilot-poll',
  maxEmailsPerCycle: 10,
  maxPagesPerBlock: 5,
  minConfidenceThreshold: 55,
  minLabelMatchLength: 5,
  excludedMappingDomains: new Set(['superhuman.com', 'mail.superhuman.com', 'linkedin.com', 'news.linkedin.com', 'mail.linkedin.com']),
  scores: { subject: 50, sender: 40, domain: 40, snippet: 20, thread: 30, mapping: 35 },
  systemLabels: new Set(['INBOX', 'SPAM', 'TRASH', 'UNREAD', 'STARRED', 'IMPORTANT', 'SENT', 'DRAFT', 'CATEGORY_PERSONAL', 'CATEGORY_SOCIAL', 'CATEGORY_PROMOTIONS', 'CATEGORY_UPDATES', 'CATEGORY_FORUMS']),
  nonPrimaryCategories: new Set(['CATEGORY_SOCIAL', 'CATEGORY_PROMOTIONS', 'CATEGORY_UPDATES', 'CATEGORY_FORUMS']),
  storageKey: 'labelpilot.v2',
  activityLimit: 500,
} as const;

export const TEXT_OPTIONS = {
  expectedInputs: [{ type: 'text', languages: ['en'] }],
  expectedOutputs: [{ type: 'text', languages: ['en'] }],
} as const;
