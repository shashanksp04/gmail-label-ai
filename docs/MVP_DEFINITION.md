# LabelPilot v2 MVP definition

**Status:** MVP behavior is specified; implementation and validation are in progress. Follow [README_REDESIGN.md](../README_REDESIGN.md) as the implementation checklist. Last reviewed 2026-09-13.

## MVP outcome

Users can link multiple Gmail accounts, preview conservative label decisions, then explicitly enable automatic labeling per account. The extension uses existing Gmail labels, performs local classification from message metadata, and leaves uncertain messages unchanged.

## Included

- Manifest V3 extension with TypeScript build, lint, and automated test tooling.
- Multiple linked account contexts isolated in local extension storage.
- Gmail label sync, inbox metadata retrieval, and existing-label application.
- Preview mode that performs no Gmail mutation, followed by opt-in automation.
- Deterministic matching and optional Chrome built-in AI fallback.
- Per-account sender mappings and settings.
- Account switching, unlinking, activity history, label refresh, and reset controls.
- Structured logs, normalized API errors, and bounded retries.
- Unit tests and a documented manual validation checklist.

## Excluded

- Backend, cloud AI, full email-body retrieval, Gmail UI injection, multiple labels per message, shared/team accounts, or learning from manual corrections.

## MVP acceptance criteria

- Two Gmail accounts can be linked and switched, including after a service-worker restart, with no state or token crossover.
- Preview displays proposed label, decision source, and skip reason and makes no Gmail changes.
- Automation is off by default, per-account, and can be paused; only validated labels belonging to that Gmail account can be applied.
- AI readiness and errors are visible; AI failure never blocks deterministic decisions or leads to an unvalidated mutation.
- Account unlink/reset behavior is explicit and does not delete another account's data.
- Automated tests cover storage, classification, Gmail errors, AI protocol, scan/pagination, concurrency, and preview safety.
- The manual Chrome/Gmail checklist passes on supported current Chrome.

## Current implementation assessment

The v2 source implements the TypeScript toolchain, initial account-scoped storage, Gmail client/parser, classifier, basic AI handoff, popup actions, activity logging, and a non-mutating preview scan. The current 7 unit tests cover utilities, parsing, deterministic classification, and schema isolation only. Multi-account token selection, user-readable preview review, scan/account race handling, AI API compatibility, and comprehensive test coverage are still incomplete, so the MVP acceptance criteria are not yet met.
