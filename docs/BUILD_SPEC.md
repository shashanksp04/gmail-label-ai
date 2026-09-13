# LabelPilot v2 build specification

**Status:** Target architecture for the v2 redesign. The implementation is partial; see [README_REDESIGN.md](../README_REDESIGN.md) for status and gaps. Last reviewed 2026-09-13.

## Runtime architecture

Manifest V3, TypeScript, Vite, Vitest, ESLint, and Prettier. The service worker coordinates operations; modules isolate account/token handling, Gmail REST access, parsing, classification, AI messaging, storage, and logging. The popup is the user-facing control surface. An offscreen document is used for Prompt API requests.

All logic remains local to the extension except Gmail API requests. The extension does not fetch full message bodies and has no backend or cloud AI dependency.

## Build and public interfaces

Commands:

```bash
npm run typecheck
npm test
npm run lint
npm run build
```

The production build is `dist/`, loaded as an unpacked extension. Account/runtime messages currently include `LINK_ACCOUNT`, `LIST_ACCOUNTS`, `SWITCH_ACCOUNT`, `UNLINK_ACCOUNT`, `PREVIEW_SCAN`, `SCAN_NOW`, `GET_ACTIVITY`, `SET_AUTOMATION`, `REFRESH_LABELS`, and `RESET_ALL`.

The intended classification result is:

```ts
interface ClassificationResult {
  decision: 'label' | 'skip';
  labelId: string | null;
  confidence: number | null;
  source: 'deterministic' | 'ai' | 'none';
  reason: string;
}
```

## Account state and authentication

Persist a versioned root state under `labelpilot.v2` with one account context per verified Gmail profile. Keep tokens only in Chrome Identity's cache or service-worker memory. Before Gmail mutation, verify the token's Gmail profile matches the selected account. Account context includes labels, sender mappings, pagination, per-account automation/primary/AI settings, and timestamps. Activity uses separately bounded per-account storage.

The implementation currently uses Gmail email as the local account key and Chrome Identity token requests, but exact token-to-account selection has not been proven across worker restarts or secondary accounts. That is a release blocker, not a solved property.

Do not migrate legacy prototype data automatically. A reset-all message exists; add an explicit confirmed UI before calling the control complete.

## Scan and classification requirements

- Allow only one scan at a time; make account switch/unlink coordinate with active work.
- Support preview and automatic modes. Preview must never call the Gmail modify endpoint and must display proposals before automation is enabled.
- Use account-scoped pagination and enforce the per-cycle message limit without cursor loss or starvation.
- Ignore system labels when deciding whether a message already has a user label.
- Apply only an existing current-account Gmail label after successful classification.
- Deterministic matcher runs first. Ties, low confidence, missing labels, and malformed output must skip.
- Store a sender-domain mapping only after Gmail confirms label application, and only for non-excluded domains.

Current scan logic is concentrated in the background service worker. It has a basic mutex and preview writes no labels, but proposal rendering, scan-cancellation/account locking, and pagination edge-case tests remain incomplete.

## Chrome built-in AI requirements

Represent unsupported, unavailable, downloadable, downloading, available, initializing, ready, and failed states explicitly. Start model initialization/download only from a user-activated UI action when Chrome requires it. Send metadata as untrusted data, provide only current-account label candidates, validate the response against exact existing label IDs, apply a timeout, and clean up sessions where supported. AI failure must degrade to deterministic-only classification.

The current popup initializes on click and the offscreen code checks availability and exact label IDs, but structured `responseConstraint`, full state reporting, cancellation, and Chrome runtime validation are not complete.

## Logging, errors, and verification

Log structured account/run/message-correlated events for auth, label sync, scan, eligibility, classification, AI, and label application. Bound retention and redact tokens, bodies, snippets, and unnecessary personal data. Add tests for redaction and event behavior.

Required tests include parsing, scoring, ties/thresholds, AI response validation, account storage isolation, token/profile matching, pagination/limits, scan locking, preview non-mutation, retries, error normalization, and failure logging. Run the manual checklist in [README_REDESIGN.md](../README_REDESIGN.md) on current supported Chrome with real Gmail test accounts before release.
