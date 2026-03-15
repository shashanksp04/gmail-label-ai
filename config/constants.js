/**
 * LabelPilot - Configuration constants
 */

const CONFIG = {
  // Gmail API
  GMAIL_API_BASE: 'https://gmail.googleapis.com/gmail/v1/users/me',

  // Gmail inbox query - Primary tab only (excludes Social, Promotions, etc.)
  INBOX_QUERY: 'in:inbox category:primary',

  // Polling
  POLL_INTERVAL_MINUTES: 2,
  ALARM_NAME: 'labelpilot-poll',

  // Processing limits
  MAX_EMAILS_PER_CYCLE: 10,

  // Classification scoring (BUILD_SPEC section 9)
  SCORES: {
    SUBJECT_MATCH: 50,
    SENDER_NAME_MATCH: 40,
    SENDER_DOMAIN_MATCH: 40,
    SNIPPET_SIMILARITY: 20,
    THREAD_MATCH: 30,
    HISTORICAL_SENDER_MAPPING: 35, // Reduced from 60 - requires other signals to confirm
  },

  // Minimum score to apply a label
  MIN_CONFIDENCE_THRESHOLD: 55,

  // Domains that send diverse content - do NOT store sender mappings for these
  EXCLUDED_SENDER_MAPPING_DOMAINS: [
    'superhuman.com',
    'mail.superhuman.com',
    'linkedin.com',
    'news.linkedin.com',
    'mail.linkedin.com',
  ],

  // Minimum label length for subject/snippet matching (avoid "Intern" etc.)
  MIN_LABEL_MATCH_LENGTH: 5,

  // Storage keys
  STORAGE_KEYS: {
    SENDER_MAPPINGS: 'senderMappings',
    CACHED_LABELS: 'cachedLabels',
    LAST_PROCESSED_ID: 'lastProcessedId',
    AUTH_STATUS: 'authStatus',
    DEBUG_MODE: 'debugMode',
  },

  // System labels to exclude (Gmail built-in)
  SYSTEM_LABELS: ['INBOX', 'SPAM', 'TRASH', 'UNREAD', 'STARRED', 'IMPORTANT', 'SENT', 'DRAFT', 'CATEGORY_PERSONAL', 'CATEGORY_SOCIAL', 'CATEGORY_PROMOTIONS', 'CATEGORY_UPDATES', 'CATEGORY_FORUMS'],
};

// Export for use in extension (global in extension context)
if (typeof self !== 'undefined') {
  self.CONFIG = CONFIG;
}
