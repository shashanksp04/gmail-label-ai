# LabelPilot - Update Log

> This file records historical changes. The current implementation status is tracked in [README_REDESIGN.md](../README_REDESIGN.md); current code architecture is described in [context.md](../context.md).

## 2026-03-15 14:03

### Initial Release & Feature Updates

**Date:** Sunday, March 15, 2026  
**Time:** 14:03

---

### Chrome Extension Build

- **Manifest V3** — Extension manifest with required permissions (identity, storage, alarms, offscreen)
- **OAuth 2.0** — Gmail authentication via Chrome Identity API with scopes: `gmail.modify`, `gmail.labels`
- **Background Service Worker** — Polling, email processing pipeline, message handling for popup
- **Gmail API Integration** — Fetch labels, messages, metadata; apply labels via REST API

---

### Chrome Built-in AI Integration

- **Offscreen Document** — `offscreen/offscreen.html` and `offscreen/offscreen.js` for running LanguageModel (Prompt API)
- **AI Fallback** — When deterministic matching is insufficient, delegates to offscreen document for Gemini Nano classification
- **Manifest** — Added `offscreen` permission for document creation

---

### Classification Engine

- **Deterministic Matcher** — Scores labels using: subject match, sender name/domain, snippet similarity, historical sender mappings, thread match
- **Scoring Weights** — Subject: 50, Sender name: 40, Sender domain: 40, Snippet: 20, Thread: 30, Historical mapping: 35
- **Confidence Threshold** — Minimum score 55 required to apply a label
- **AI Fallback** — Chrome built-in AI selects label when deterministic signals are insufficient

---

### Label Accuracy Improvements

- **Historical Sender Mapping** — Reduced weight from 60 to 35 (requires other signals to confirm)
- **Excluded Domains** — Superhuman, LinkedIn and related domains excluded from storing sender mappings (prevents incorrect permanent mappings for senders with diverse content)
- **Min Label Match Length** — 5 characters minimum for subject/snippet matching (avoids false matches like "Intern" in newsletter content)

---

### Primary Inbox Only

- **Config** — Added `INBOX_QUERY: 'in:inbox category:primary'` to `config/constants.js`
- **Service Worker** — Uses `CONFIG.INBOX_QUERY` when fetching messages
- **Gmail Client** — Default `q` parameter updated to use `CONFIG.INBOX_QUERY`
- **Result** — Only emails in the Primary tab are processed; Social, Promotions, Updates, and Forums are ignored

---

### Popup UI

- **Auth Status** — Sign in to Gmail, connection status display
- **AI Status** — Shows Chrome built-in AI availability (Ready, Downloading, etc.)
- **Scan Now** — Manual trigger for inbox scan
- **Sender Mappings** — List of domain → label mappings with Remove button per item
- **Clear All Mappings** — Button to reset all sender mappings

---

### Dashboard Size & Readability

- **Popup Dimensions** — Width: 320px → 400px; Max height: 480px → 640px
- **Mappings List** — Max height: 160px → 320px (shows ~2x more mappings)
- **Text Display** — Full domain names with word wrapping instead of ellipsis truncation
- **Layout** — Added gap and flex-start alignment for wrapped mapping items

---

### Error Handling & Reliability

- **Gmail API Retry** — Exponential backoff for 429 and 5xx responses (up to 3 retries)
- **Token Expiration** — Clears invalid token and removes from cache; triggers re-auth flow

---

### Block-Based Pagination with New Email Priority

- **Config** — Added `MAX_PAGES_PER_BLOCK: 5`, `PRIMARY_ONLY: true`, storage key `NEXT_BLOCK_PAGE_TOKEN` in `config/constants.js`
- **Storage** — `getNextBlockPageToken()` and `setNextBlockPageToken(token)` in `storage_manager.js` to persist block progress
- **Scan Flow** — Each run: (1) Always fetch page 1 first for new emails; (2) Process current block (1-5, 6-10, 11-15...) until fully labeled; (3) Advance to next block only when all emails in block are processed/skipped
- **Per-Run Limit** — `MAX_EMAILS_PER_CYCLE` (10) caps labels per run; block advances only when limit not hit
- **Result** — New emails processed every run; blocks processed sequentially until fully labeled; Primary inbox only

---

### LanguageModel API Output Language

- **Offscreen** — Added `expectedOutputs: [{ type: 'text', languages: ['en'] }]` to `LanguageModel.availability()` and `LanguageModel.create()` in `offscreen/offscreen.js`
- **Popup** — Added same `expectedOutputs` option to `LanguageModel.availability()` in `popup/popup.js`
- **Result** — Resolves "No output language was specified in a LanguageModel API request" error; supported codes: en, es, ja

---

### Project Structure

```
gmail-label-ai/
├── manifest.json
├── background/service_worker.js
├── offscreen/offscreen.html, offscreen.js
├── gmail/gmail_client.js, gmail_parser.js
├── classifier/classifier_engine.js, deterministic_matcher.js, ai_fallback.js
├── storage/storage_manager.js
├── utils/text_utils.js
├── config/constants.js
└── popup/popup.html, popup.js
```

## 2026-09-13 — v2 architecture implementation (in progress)

### Implemented in the repository

- Added a TypeScript/Vite build, strict type checking, ESLint, and Vitest.
- Added a new typed `src/` architecture and kept v1 flat storage separate under a fresh `labelpilot.v2` namespace.
- Added initial account link/list/switch/unlink flows, account-scoped labels, mappings, settings, and pagination state.
- Added a typed Gmail REST client/parser, profile verification, normalized error categories, and bounded retries.
- Added deterministic classification results with skip reasons and a preview scan that does not call Gmail label modification.
- Added optional Prompt API handoff, click-triggered initialization, exact existing-label-ID validation, and structured per-account activity events.
- Added basic popup controls for account actions, preview, automation, AI initialization, label refresh, and recent activity.
- Added seven unit tests for parser, matching, utility, and account-schema behavior.

### Known gaps — not yet release-ready

- Multi-account token selection and restoration after service-worker restart need live Chrome verification and likely further implementation. Never assume the account-switching requirement is complete based on UI presence alone.
- Preview decisions are logged but not shown in a readable proposal/review list.
- Account switching/unlinking does not cancel or wait for active scan work; pagination and concurrency boundaries are not covered by tests.
- Prompt API structured output constraints, complete readiness-state handling, and actual offscreen runtime compatibility need work and browser verification.
- Reset-all has no popup control; activity filtering/export and automated redaction checks are absent.
- Current tests do not exercise Chrome Identity, Gmail API integration, account lifecycle, storage integration, scans, pagination, retries, or AI messaging.
- Browser/Gmail manual validation has not been completed.

### Verification snapshot

At the time of this entry, `npm test` (7 tests), `npm run lint`, `npm run typecheck`, and `npm run build` pass locally. This confirms compilation and unit-level behavior only; it does not establish live extension readiness.
