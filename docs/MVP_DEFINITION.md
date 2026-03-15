# MVP_DEFINITION.md

**Project:** LabelPilot
**Type:** Chrome Extension for Automatic Gmail Labeling
**Goal:** Automatically assign appropriate existing Gmail labels to emails using a generic classification pipeline that runs locally within a Chrome extension.

---

# 1. MVP Goal

The goal of the MVP is to build a **Chrome extension that automatically labels Gmail emails without requiring user interaction**.

Once the extension is enabled, it should:

1. Detect emails that do not yet have user-applied labels
2. Analyze email metadata
3. Select the most appropriate label from the user’s existing labels
4. Automatically apply the label through the Gmail API

The system runs **fully automatically in the background**.

The user only needs to:

* Install the Chrome extension
* Enable it

No additional interaction is required.

---

# 2. Core Problem

Many Gmail users create labels but do not consistently apply them to emails.
Manual labeling requires attention and effort, which leads to disorganized inboxes.

This extension solves the problem by **automatically applying the most appropriate existing label to incoming emails** using patterns already present in the user's inbox.

---

# 3. Target User (MVP)

Primary user:

* The developer (personal use)

Future users may include:

* Gmail power users
* productivity-focused users
* users who rely heavily on Gmail labels for organization

---

# 4. MVP Scope

The MVP focuses on **fully automatic labeling using a generic classification pipeline**.

## 4.1 Extension Activation

The only required user action is:

* installing and enabling the Chrome extension

After activation, the extension runs automatically in the background.

---

## 4.2 Gmail Authentication

The extension authenticates with Gmail using OAuth.

Permissions are required to:

* read email metadata
* retrieve labels
* apply labels

---

## 4.3 Label Retrieval

The extension retrieves the user’s existing Gmail labels.

These labels form the **candidate set** from which the system selects the best label.

System labels (for example `INBOX`, `SPAM`, `TRASH`) are excluded.

---

## 4.4 Email Monitoring

The extension periodically checks Gmail for emails that require labeling.

Eligible emails include:

* newly received emails
* emails that do not yet have user-created labels

Emails already labeled by the user are skipped.

---

## 4.5 Email Metadata Extraction

For each email being evaluated, the extension retrieves:

* sender email address
* sender display name
* subject line
* Gmail snippet (preview text)

The full email body is **not required for the MVP**.

---

# 5. Label Classification Strategy

The system uses a **generic layered classification pipeline** to determine the best label.

For each email:

1. Retrieve the list of available user labels
2. Evaluate each label against the email using multiple signals
3. Rank candidate labels by confidence
4. Apply the highest-confidence label if it exceeds the required threshold

If no label reaches sufficient confidence, the email is left unchanged.

---

## 5.1 Classification Signals

The classifier evaluates labels using signals such as:

**Label–Subject Similarity**

* comparison between label names and the email subject

**Sender Matching**

* sender display name
* sender email address
* sender domain

**Snippet Similarity**

* comparison between label names and email preview text

**Historical Sender Association**

* repeated emails from the same sender mapping to the same label

**Thread Consistency**

* if other emails in the thread already have a label

---

## 5.2 AI Fallback

If deterministic signals are insufficient, the extension may use **Chrome's built-in AI** to select the most appropriate label from the candidate list.

The AI model must:

* choose **only from existing labels**
* return **one label**

No new labels may be generated.

---

# 6. Automatic Label Application

Once a label is selected, the extension:

1. Calls the Gmail API
2. Applies the label to the email

The process is fully automatic and requires no user approval.

---

# 7. Explicitly Out of Scope (MVP)

The following features are intentionally excluded:

* manual approval of labels
* label suggestions
* user interaction workflows
* multi-label classification
* training models on historical inbox data
* explanation of classification decisions
* learning from corrections
* analytics dashboards
* Gmail UI modifications
* backend infrastructure
* external AI APIs
* multi-account support
* enterprise/team inbox features

---

# 8. System Workflow

**Step 1 — Extension Enabled**

The user installs and enables the extension.

---

**Step 2 — Gmail Authentication**

The extension authenticates with Gmail and retrieves labels.

---

**Step 3 — Email Detection**

The extension checks for emails requiring labeling.

---

**Step 4 — Metadata Extraction**

Email metadata is retrieved.

---

**Step 5 — Label Evaluation**

The system evaluates candidate labels using classification signals.

---

**Step 6 — AI Fallback (Optional)**

If deterministic signals are insufficient, Chrome built-in AI selects the best label.

---

**Step 7 — Automatic Label Application**

The selected label is applied to the email.

---

# 9. Success Criteria

The MVP is successful if the extension can:

1. Authenticate with Gmail
2. Retrieve existing Gmail labels
3. Detect emails requiring labeling
4. Extract relevant email metadata
5. Select the most appropriate label
6. Apply the label automatically
7. Run continuously without user interaction

---

# 10. MVP Constraints

### Personal Use Only

The extension is initially built for the developer’s Gmail account.

### Local Execution

All classification logic runs locally in the Chrome extension.

### No Backend

No server infrastructure is required.

### Minimal Permissions

The extension will only request Gmail scopes necessary to:

* read email metadata
* retrieve labels
* apply labels

---

# 11. High-Level Architecture

Chrome Extension
│
├── Background Service Worker
│   ├── Email monitoring
│   ├── Label classification
│   └── Gmail API interaction
│
├── Gmail API Integration
│   ├── Fetch labels
│   ├── Fetch email metadata
│   └── Apply labels
│
└── Chrome Built-in AI (Optional)
└── Label selection fallback

---

# 12. Expected Development Effort

Estimated development time:

**2–4 days**

Key development tasks:

1. Chrome extension setup
2. Gmail OAuth integration
3. Label retrieval
4. Email polling logic
5. Generic classification pipeline
6. Chrome AI fallback integration
7. Automatic label application

---

# 13. Definition of Done

The MVP is considered complete when:

* the extension installs successfully
* Gmail authentication works
* labels are retrieved correctly
* emails are detected automatically
* labels are selected reliably
* labels are applied automatically
* the system runs without manual interaction

---

# 14. Future Expansion

Possible improvements after MVP:

* confidence scoring
* multi-label classification
* learning from user corrections
* historical inbox training
* better sender-domain pattern detection
* Gmail UI indicators for applied labels
* analytics for labeling accuracy
* shared/team inbox support

---
