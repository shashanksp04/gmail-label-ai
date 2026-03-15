# PRODUCT_SPEC.md

**Project:** LabelPilot
**Type:** Chrome Extension
**Category:** Email Productivity / Inbox Automation
**Status:** Pre-Build Specification

---

# 1. Product Overview

LabelPilot is a **Chrome extension that automatically applies Gmail labels to emails** using a combination of deterministic matching and local AI classification.

The extension runs entirely on the client and requires **no manual interaction after activation**. Once enabled, it continuously analyzes incoming emails and assigns the most appropriate existing Gmail label.

LabelPilot leverages the organization system that users have already built in Gmail by **learning from and utilizing existing labels rather than creating a new categorization system**.

---

# 2. Product Vision

The long-term vision for LabelPilot is to become a **fully autonomous inbox organization assistant** that:

* understands how users structure their inbox
* automatically organizes emails into meaningful categories
* reduces inbox clutter
* eliminates manual labeling

The system should feel **invisible and reliable**, quietly keeping the inbox organized without requiring attention.

---

# 3. Product Philosophy

The design of LabelPilot follows several core principles.

## 3.1 Automation First

The product should work **without requiring user interaction**.

Users should not need to review, confirm, or approve labels.
The system should confidently apply labels automatically.

---

## 3.2 Use Existing Structures

Instead of introducing a new classification system, LabelPilot uses:

* the user’s existing Gmail labels
* existing sender patterns
* existing inbox structure

This ensures the system aligns with how the user already organizes information.

---

## 3.3 Local Processing

All classification should run locally whenever possible.

Benefits:

* better privacy
* no cloud AI costs
* lower latency
* simpler architecture

Chrome’s built-in AI is used when deterministic classification is insufficient.

---

## 3.4 Conservative Decision Making

The system should prefer **accuracy over coverage**.

If the system is not confident about a label, it should leave the email unchanged.

Incorrect labels are more harmful than unlabeled emails.

---

# 4. Core Product Capabilities

LabelPilot provides four core capabilities.

---

## 4.1 Inbox Monitoring

The extension monitors Gmail for emails that require labeling.

Emails considered for classification include:

* newly received emails
* emails that do not yet have user-created labels

Emails already labeled are ignored.

---

## 4.2 Email Understanding

For each email, the extension extracts key metadata:

* sender email address
* sender display name
* subject line
* snippet (preview text)

These signals are sufficient to determine labels for most emails.

Full email body analysis is not required for the MVP.

---

## 4.3 Label Selection

The system selects the best label from the user's existing labels.

Classification is performed using a hybrid approach:

1. deterministic matching
2. historical sender associations
3. thread context
4. optional AI fallback

The classifier ranks candidate labels and selects the highest-confidence option.

---

## 4.4 Automatic Label Application

Once a label is selected, it is automatically applied to the email using the Gmail API.

No user confirmation is required.

---

# 5. Classification Strategy

The classification system evaluates each label against an email using several signals.

## 5.1 Subject Similarity

Compare label names with the email subject.

Examples:

* label: "TLDR"
* subject: "TLDR AI — This Week in AI"

Strong match.

---

## 5.2 Sender Matching

Labels may correspond to senders or organizations.

Signals include:

* sender display name
* sender email address
* sender domain

Example:

```
sender: newsletter@alphasignal.ai
label: AlphaSignal
```

---

## 5.3 Snippet Similarity

Preview text often contains identifying information.

Example:

```
snippet: "Welcome to this week's AI Report..."
label: AI Report
```

---

## 5.4 Historical Associations

If a sender consistently maps to a label, the system should reuse that mapping.

Example:

```
news@tldrnewsletter.com → TLDR
```

---

## 5.5 Thread Consistency

If earlier emails in the same thread have a label, that label should be preferred.

---

## 5.6 AI Fallback

If deterministic signals do not produce a confident result, Chrome’s built-in AI may select the best label from the candidate list.

The model must:

* choose only from existing labels
* return a single label

---

# 6. Product Workflow

### Step 1 — Extension Installed

User installs the Chrome extension.

---

### Step 2 — Authentication

User grants Gmail permissions.

---

### Step 3 — Label Retrieval

Extension fetches user-created Gmail labels.

---

### Step 4 — Inbox Monitoring

Extension periodically checks for emails needing classification.

---

### Step 5 — Email Analysis

Metadata is extracted from each email.

---

### Step 6 — Label Classification

The classifier ranks candidate labels.

---

### Step 7 — Label Application

The best label is applied automatically.

---

# 7. Product Boundaries

The product intentionally avoids certain behaviors.

LabelPilot does **not**:

* create new labels
* ask users to approve labels
* provide manual inbox controls
* replace Gmail categories
* modify the Gmail UI

It operates as a **background automation tool**.

---

# 8. Key Product Benefits

### Reduced Inbox Friction

Users no longer need to manually label emails.

---

### Faster Email Organization

Incoming emails are categorized automatically.

---

### Better Label Utilization

Users who created labels but rarely apply them will see their organization system become effective.

---

### Private by Design

Most classification happens locally inside the browser.

---

# 9. Risks and Challenges

## Gmail Permission Sensitivity

Users may hesitate to grant email access permissions.

Mitigation:

* limit requested scopes
* ensure transparent behavior

---

## Label Ambiguity

Some labels may be difficult to differentiate.

Mitigation:

* use conservative confidence thresholds
* avoid forcing labels

---

## Local AI Availability

Chrome built-in AI may not be available on all devices.

Mitigation:

* deterministic classification should cover most cases

---

# 10. Product Roadmap

## Phase 1 — MVP

* automatic label application
* deterministic classification
* optional AI fallback
* background automation

---

## Phase 2 — Accuracy Improvements

* better fuzzy matching
* improved sender-domain mapping
* confidence scoring

---

## Phase 3 — Learning System

* learn from label patterns
* learn from repeated sender-label mappings

---

## Phase 4 — Inbox Intelligence

* multi-label classification
* label ranking
* label analytics
* automatic label recommendations

---

# 11. Non-Goals (Current Version)

The following features are intentionally excluded from the initial product:

* manual inbox tools
* email summarization
* email prioritization
* reply suggestions
* full AI inbox assistant behavior

LabelPilot focuses **only on automated labeling**.

---

# 12. Success Criteria

The product is successful if:

* emails are labeled automatically
* label accuracy is high
* users rarely need to manually label emails
* inbox organization improves without extra effort

The ultimate goal is to make labeling **invisible and effortless**.

---
