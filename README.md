# LabelPilot

LabelPilot is a Manifest V3 Chrome extension prototype that classifies Gmail inbox messages with deterministic rules and optional Chrome built-in AI. It is client-only: message metadata is fetched from Gmail, classification runs locally, and labels are applied through Gmail's API only when automation is enabled.

## Current status

The v2 architecture and first implementation are in place, but this is **not yet release-ready**. In particular, live multi-account token selection/switching, a useful preview review screen, and Chrome AI behavior still require implementation hardening and manual browser validation. See [README_REDESIGN.md](README_REDESIGN.md) for the authoritative implementation checklist and known gaps.

## Development and loading

Requirements: Node.js/npm and a desktop Chrome version that supports the APIs used by the extension.

```bash
npm install
npm run typecheck
npm test
npm run lint
npm run build
```

In `chrome://extensions`, enable Developer mode and load the generated `dist/` directory as an unpacked extension. Configure the OAuth client ID in `manifest.json` for the unpacked extension ID and ensure Gmail API and the declared scopes are enabled in the associated Google Cloud project.

## Intended user workflow

1. Link a Gmail account from the popup.
2. Load that account's Gmail labels.
3. Run a preview scan and inspect proposed labels/activity.
4. Explicitly enable automation when satisfied.
5. Switch accounts without sharing labels, mappings, pagination, settings, or activity.

The current popup exposes linking, account selection, preview triggering, automation toggle, label refresh, unlinking, AI initialization, and recent activity. Preview results are currently recorded as activity metadata but are not yet rendered as a clear proposal list; treat this workflow as incomplete until that is fixed.

## Architecture

- `src/background/`: MV3 service worker and message routing.
- `src/auth/`: account linking and in-memory token handling.
- `src/gmail/`: typed Gmail API client and parsers.
- `src/scanning/`: reserved for scan coordination as the implementation is decomposed further; current orchestration is in the service worker.
- `src/classification/`: deterministic matching and AI fallback coordination.
- `src/ai/`: Prompt API initialization and offscreen document communication.
- `src/storage/`: versioned `labelpilot.v2` account state and activity storage.
- `src/logging/`: structured local activity events.
- `src/popup/`: account, preview, automation, AI, and activity controls.
- `tests/`: current unit tests for utilities, Gmail parsing, classification, and schema isolation.

## Privacy and safety

- No backend or external AI provider is used.
- Classification uses sender, subject, snippet, and Gmail label metadata; it does not fetch full message bodies.
- AI is optional. Invalid, unavailable, or failed AI results are not applied.
- Sender mappings and extension state are stored locally per linked account.
- Do not enable automatic labeling until the account, preview, and failure paths have been manually checked in Chrome.

## License

MIT
