# BUILD_SPEC.md

**Project:** LabelPilot
**Type:** Chrome Extension
**Purpose:** Define the technical architecture and implementation details required to build the MVP.

---

# 1. System Overview

LabelPilot is a **Chrome extension that automatically labels Gmail emails** using a layered classification pipeline.

The extension operates entirely on the client and performs the following workflow:

1. Authenticate with Gmail
2. Retrieve user-created labels
3. Monitor emails requiring labeling
4. Extract email metadata
5. Evaluate candidate labels
6. Optionally use Chrome built-in AI
7. Apply the selected label

All logic runs **locally inside the Chrome extension**.

---

# 2. High-Level Architecture

```
Chrome Extension
│
├── Background Service Worker
│   ├── Gmail polling
│   ├── email processing queue
│   ├── label classification
│   └── Gmail API interaction
│
├── OAuth Handler
│   └── Gmail authentication
│
├── Classification Engine
│   ├── deterministic matcher
│   ├── sender association mapping
│   └── AI fallback
│
└── Storage Layer
    └── local extension storage
```

---

# 3. Chrome Extension Structure

```
labelpilot-extension/
│
├── manifest.json
├── background/
│   └── service_worker.js
│
├── gmail/
│   ├── gmail_client.js
│   └── gmail_parser.js
│
├── classifier/
│   ├── classifier_engine.js
│   ├── deterministic_matcher.js
│   └── ai_fallback.js
│
├── storage/
│   └── storage_manager.js
│
├── utils/
│   └── text_utils.js
│
└── config/
    └── constants.js
```

---

# 4. Chrome Extension Configuration

### Manifest Version

Use **Manifest V3**.

---

### Required Permissions

```
{
  "permissions": [
    "identity",
    "storage",
    "alarms"
  ],
  "host_permissions": [
    "https://gmail.googleapis.com/*"
  ]
}
```

---

### OAuth Scopes

Minimum Gmail scopes required:

```
https://www.googleapis.com/auth/gmail.modify
https://www.googleapis.com/auth/gmail.labels
```

These allow:

* reading message metadata
* retrieving labels
* applying labels

---

# 5. Authentication Flow

Authentication uses **Chrome Identity API**.

### Flow

1. User installs extension
2. Extension triggers OAuth login
3. User grants Gmail permissions
4. Extension receives access token
5. Token stored temporarily in extension memory

### Token Refresh

If token expires:

* re-request token via Chrome Identity API

---

# 6. Gmail API Integration

The extension communicates with Gmail via the **Gmail REST API**.

---

## 6.1 Retrieve Labels

Endpoint:

```
GET https://gmail.googleapis.com/gmail/v1/users/me/labels
```

Filter:

* exclude system labels
* keep only user-created labels

Store:

```
label_id
label_name
normalized_label_name
```

---

## 6.2 Detect Emails Requiring Labeling

Use message list endpoint:

```
GET /gmail/v1/users/me/messages
```

Query parameters:

```
q=-label:inbox_category OR custom filtering
```

More practical approach:

Retrieve:

```
messages in INBOX
```

Then filter messages:

* without user labels

---

## 6.3 Retrieve Message Metadata

Endpoint:

```
GET /gmail/v1/users/me/messages/{id}
```

Use:

```
format=metadata
```

Retrieve:

* subject
* from
* snippet
* threadId

---

## 6.4 Apply Label

Endpoint:

```
POST /gmail/v1/users/me/messages/{id}/modify
```

Payload:

```
{
  "addLabelIds": ["LABEL_ID"]
}
```

---

# 7. Email Processing Pipeline

Each email flows through the following pipeline.

```
email detected
    ↓
metadata extraction
    ↓
candidate label scoring
    ↓
deterministic match
    ↓
AI fallback (optional)
    ↓
confidence evaluation
    ↓
apply label
```

---

# 8. Deterministic Matching

Deterministic matching evaluates labels using text similarity.

### Inputs

```
label_name
subject
sender_name
sender_email
snippet
```

### Matching Strategies

#### Exact Match

```
subject contains label name
```

#### Normalized Match

Remove:

* punctuation
* casing
* whitespace

Example:

```
"AI Report"
"AIReport"
```

#### Sender Match

Compare label against:

* sender display name
* sender domain

Example:

```
newsletter@alphasignal.ai
→ AlphaSignal
```

---

# 9. Label Scoring

Each label receives a score based on signals.

Example scoring model:

| Signal                    | Score |
| ------------------------- | ----- |
| subject match             | +50   |
| sender name match         | +40   |
| sender domain match       | +40   |
| snippet similarity        | +20   |
| thread match              | +30   |
| historical sender mapping | +60   |

Highest score wins.

Minimum threshold required for application.

---

# 10. Historical Sender Mapping

Extension stores sender-label mappings locally.

Example:

```
news@tldrnewsletter.com → TLDR
```

Storage location:

```
chrome.storage.local
```

Data structure:

```
{
  sender_domain: label_id
}
```

Mappings updated whenever a label is applied.

---

# 11. AI Fallback

If deterministic scoring fails to produce a confident label:

Use **Chrome built-in AI**.

### Input

```
email metadata
list of labels
```

### Prompt Strategy

AI must:

* choose from provided labels
* return exactly one label

Example prompt structure:

```
Email Subject: {subject}
Sender: {sender}
Snippet: {snippet}

Choose the most appropriate label from this list:

[label1, label2, label3...]

Return only the label name.
```

---

# 12. Email Monitoring Strategy

Use **Chrome alarms** to trigger periodic checks.

Example interval:

```
every 2 minutes
```

Alarm handler triggers:

```
scanInbox()
```

Processing steps:

1. fetch recent emails
2. filter unlabeled emails
3. run classification pipeline

---

# 13. Storage Layer

Use:

```
chrome.storage.local
```

Store:

* sender-label mappings
* cached labels
* processing checkpoints

---

# 14. Error Handling

Handle the following scenarios.

### Gmail API Errors

Retry with exponential backoff.

---

### Token Expiration

Re-run OAuth flow.

---

### AI Unavailable

Fallback to deterministic classifier only.

---

### Rate Limits

Reduce polling frequency.

---

# 15. Performance Considerations

### Avoid Reprocessing Emails

Store last processed message ID.

---

### Process Emails in Batches

Limit each cycle:

```
max 10 emails
```

---

### Lightweight Metadata

Avoid downloading full message body.

---

# 16. Security Considerations

The extension must:

* request minimal Gmail scopes
* store tokens only in memory
* avoid logging sensitive email data
* perform processing locally

---

# 17. Logging and Debugging

Add lightweight debug logs.

Example logs:

```
EMAIL_DETECTED
CLASSIFICATION_STARTED
LABEL_SELECTED
LABEL_APPLIED
AI_FALLBACK_TRIGGERED
```

Logging can be toggled via a debug flag.

---

# 18. Development Milestones

### Milestone 1 — Extension Skeleton

* manifest setup
* service worker
* OAuth integration

---

### Milestone 2 — Gmail Integration

* fetch labels
* fetch messages
* apply labels

---

### Milestone 3 — Deterministic Classifier

* subject matching
* sender matching
* scoring system

---

### Milestone 4 — Automation Loop

* inbox polling
* processing queue

---

### Milestone 5 — AI Integration

* Chrome AI fallback
* label selection

---

# 19. Estimated Build Time

Total development effort:

**3–5 days**

Breakdown:

| Task                   | Time    |
| ---------------------- | ------- |
| Chrome extension setup | 4 hours |
| OAuth + Gmail API      | 1 day   |
| classification engine  | 1 day   |
| automation loop        | 0.5 day |
| AI fallback            | 0.5 day |
| testing & debugging    | 1 day   |

---

# 20. Completion Criteria

The build is considered complete when:

* the extension authenticates with Gmail
* labels are retrieved correctly
* emails are detected automatically
* classification selects appropriate labels
* labels are applied automatically
* the extension runs continuously without manual intervention

---
