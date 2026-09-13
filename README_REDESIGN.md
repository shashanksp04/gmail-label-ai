# LabelPilot v2 implementation status

Last reviewed: 2026-09-13

This is the working status tracker for the redesign. Update this file as implementation or browser verification changes. `README.md` is the setup overview; `context.md` describes the current code; product intent is in `docs/PRODUCT_SPEC.md`.

## Overall status: In progress — not release-ready

The TypeScript/build/test foundation and an initial v2 runtime slice exist. Automated checks pass, but the extension has not been validated against live Gmail accounts or Chrome's built-in AI. The current implementation should be treated as a development prototype.

## Implementation checklist

| Area | Status | Evidence / remaining work |
| --- | --- | --- |
| TypeScript, Vite, lint, test tooling | Implemented | `package.json`, `tsconfig.json`, `vite.config.ts`; checks pass locally. |
| Typed Gmail client/parser | Implemented, needs integration tests | Gmail profile, labels, inbox page, metadata, and modify calls exist; API behavior is not live-tested. |
| Versioned per-account state | Implemented | `labelpilot.v2`; labels, mappings, settings, and pagination are account-scoped. Activity is stored under a per-account key. |
| Multiple linked accounts | Partial / high risk | Link/list/switch/unlink UI and profile checks exist. Chrome Identity account/token association is not robustly proven across service-worker restarts or secondary Google accounts; validate and fix before use. |
| Preview before automation | Partial | Preview scan does not call Gmail modify. Proposals are logged with label IDs, but popup does not show a reviewable proposal list or label names. |
| Automation toggle and scheduled scans | Partial | Explicit toggle and alarm exist. Scan flow needs tests for mode gating, account changes during a run, pagination, and token loss. |
| Scan concurrency | Partial | A single in-memory promise blocks overlapping runs. It does not cancel or drain the current scan when the active account changes. |
| Deterministic classification | Implemented, needs safety tests | Scoring, threshold, and ties are handled; edge cases and historical mapping correctness need broader tests. |
| Chrome AI readiness and initialization | Partial / unverified | Popup checks availability and starts `create()` on click; offscreen calls validate returned IDs exactly. Structured `responseConstraint` is not implemented; actual extension API compatibility and download states need Chrome testing. |
| Structured local activity | Partial | Correlated account/run/message events and bounded retention exist. Popup shows a basic recent list only; filtering, detailed reasons, proposal review, redaction tests, and export are not implemented. |
| Label refresh and deleted-label recovery | Partial | Manual refresh exists. Automatic refresh/recovery on a deleted label or modify failure is not implemented. |
| Reset controls | Partial | Account unlink removes that account context. `RESET_ALL` handler exists, but a confirmation UI control is absent. |
| Data migration | Implemented as fresh namespace | No legacy flat-key migration; v2 uses a separate namespace. |
| Automated tests | Partial | 7 unit tests cover parsing, matching, utilities, and account schema isolation. No Chrome API mocks, storage integration, scan, account/auth, pagination, AI protocol, or Gmail retry tests yet. |
| Manual Chrome/Gmail checklist | Not run | Must be completed before enabling automation or treating the redesign as functional. |

## Immediate next steps

1. Make OAuth account identity deterministic for each linked Gmail account; test relink/switch after worker restart and verify account email before every operation that can mutate Gmail.
2. Add storage-backed proposal records and a popup review list that displays sender/subject, proposed label, source, and skip reason without exposing message contents unnecessarily.
3. Make scan ownership account-aware; prevent switching/unlinking from racing with a scan, and persist pagination correctly under tested boundaries.
4. Harden AI protocol: handle all readiness states, put the download/initialization action behind user activation, enforce response constraints where supported, validate candidate IDs, and test timeouts/errors.
5. Add account-store, Gmail-client, scan, AI protocol, and logging/redaction tests.
6. Add UI for reset-all and richer activity diagnostics; verify labels refresh/recovery behavior.
7. Complete and record the manual checklist below on supported current Chrome stable.

## Manual validation checklist

- [ ] Load `dist/` as unpacked extension with the configured OAuth client.
- [ ] Link two Gmail accounts and verify each Gmail profile matches the selected account.
- [ ] Switch between accounts before and after service-worker restart; confirm labels/mappings/settings/activity stay isolated.
- [ ] Unlink and relink one account; confirm only that account's context is removed/recreated.
- [ ] Preview scan makes no Gmail modifications and presents readable proposals before automation is enabled.
- [ ] Enable/disable automation; confirm manual preview remains non-mutating and alarms honor the active account setting.
- [ ] Verify pagination and scan limit at page/block boundaries without losing or repeatedly advancing cursors.
- [ ] Refresh labels; handle a renamed/deleted label and Gmail 401/403/404/429/5xx/network failures.
- [ ] Exercise AI unsupported, unavailable, downloadable, downloading, available, initialization, timeout, malformed output, and offscreen failure paths.
- [ ] Confirm AI can select only an existing label ID and untrusted email text cannot override classification instructions.
- [ ] Check activity correlation, retention limit, and that tokens/email snippets/body content are not logged.
- [ ] Verify browser restart, reset-one, reset-all, and cancellation/account-switch behavior.

## Decisions locked for v2

- Multiple accounts can be linked; one account is active at a time.
- New account setup starts with automation disabled and a preview-first workflow.
- Use metadata only; no full message-body retrieval.
- Leave uncertain messages unchanged; deterministic decisions remain available if AI fails.
- Keep processing local; no backend or external AI service.
- Use a clean versioned storage namespace rather than silently migrating prototype state.
