# LabelPilot product specification

**Status:** v2 direction agreed; implementation in progress. Track implementation and validation in [README_REDESIGN.md](../README_REDESIGN.md). Last reviewed 2026-09-13.

## Product goal

LabelPilot helps users apply their existing Gmail labels consistently. It uses local deterministic classification first and optional Chrome built-in AI second. Uncertain messages are left unchanged.

## Product principles

- Privacy-first: client-only processing; use message metadata, not full bodies.
- Conservative: never apply a low-confidence or invalid label.
- User-controlled: no automatic Gmail modification until the user reviews a preview and enables automation.
- Account isolation: a user can link multiple Gmail accounts and each retains independent labels, mappings, scan state, settings, and activity.
- Observable: make scan stages, decisions, skips, and errors understandable without logging email contents or credentials.

## User journey

1. Link one or more Gmail accounts and grant the declared Gmail scopes.
2. Load existing user-created labels for the selected account.
3. Run a non-mutating preview and inspect proposed labels and skipped-message reasons.
4. Enable or disable automatic labeling per account.
5. Switch accounts and return to each account's own context.
6. Inspect recent activity, refresh labels, unlink one account, or reset extension state.

## Classification behavior

Eligible messages are inbox messages without a user-created label. Primary-only mode is enabled by default. Classifiers may use sender, subject, snippet, existing Gmail labels, thread context when available, and account-specific sender-domain mappings. Existing Gmail labels are the only permitted outputs.

Deterministic matching runs first. Chrome AI may be used only when deterministic matching is inconclusive and AI is enabled and ready. If AI is unavailable, returns invalid output, or fails, the extension falls back to a deterministic skip; it must not invent a label or modify the message. Full message bodies and external AI services are out of scope.

## User-facing capabilities

The intended v2 popup/settings surface includes account linking/switching/unlinking, preview/review, per-account automation, AI readiness/initialization, label refresh, activity history, and reset controls. Some are only partially implemented today; the status tracker identifies exact gaps. In particular, the current preview is logged but not yet presented as a readable review queue, and reset-all has no UI control.

## Success criteria

- Switching accounts never mixes account state or applies a label using another account's token.
- Preview causes zero Gmail modifications and shows interpretable proposals/reasons.
- Automatic labeling is opt-in, can be disabled, and modifies Gmail only with a validated existing label.
- AI failures and authentication/API errors are visible and recoverable; uncertain messages remain unchanged.
- Local automated tests and the manual Chrome/Gmail checklist pass before release.

## Out of scope

Backend infrastructure, cloud AI, full-body classification, Gmail page injection, multi-label output, and automatic training from user corrections.
