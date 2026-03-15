# LabelPilot

A Chrome extension that automatically labels Gmail emails using deterministic matching and optional Chrome built-in AI.

## Features

- **Automatic labeling** — Runs in the background, no manual interaction needed
- **Deterministic matching** — Subject, sender, snippet, and historical sender associations
- **Chrome built-in AI** — Uses offscreen document to run Gemini Nano when deterministic signals are insufficient
- **Manage mappings** — View and remove sender→label mappings in the popup
- **Excluded domains** — Superhuman, LinkedIn, etc. don't get permanent mappings (configurable)
- **Local processing** — All logic runs in the extension, no backend required

## Setup

### 1. Create OAuth credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **Gmail API** (APIs & Services → Library → search "Gmail API")
4. Go to **APIs & Services → Credentials → Create Credentials → OAuth client ID**
5. Choose **Chrome extension** as application type
6. You'll need your extension ID:
   - Load the extension unpacked in Chrome (`chrome://extensions` → Load unpacked)
   - Copy the extension ID
   - Use it when creating the OAuth client
7. Copy the **Client ID** (e.g. `xxxxx.apps.googleusercontent.com`)

### 2. Configure the extension

Edit `manifest.json` and replace `YOUR_CLIENT_ID.apps.googleusercontent.com` with your actual Client ID:

```json
"oauth2": {
  "client_id": "YOUR_ACTUAL_CLIENT_ID.apps.googleusercontent.com",
  "scopes": [
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/gmail.labels"
  ]
}
```

### 3. Load the extension

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `gmail-label-ai` folder

### 4. Sign in

1. Click the LabelPilot icon in the toolbar
2. Click **Sign in to Gmail**
3. Grant the requested permissions

After signing in, the extension will poll your inbox every 2 minutes and automatically apply labels to unlabeled emails.

## Project structure

```
gmail-label-ai/
├── manifest.json
├── background/
│   └── service_worker.js
├── offscreen/
│   ├── offscreen.html
│   └── offscreen.js      # Chrome AI (Prompt API) runs here
├── gmail/
│   ├── gmail_client.js
│   └── gmail_parser.js
├── classifier/
│   ├── classifier_engine.js
│   ├── deterministic_matcher.js
│   └── ai_fallback.js
├── storage/
│   └── storage_manager.js
├── utils/
│   └── text_utils.js
├── config/
│   └── constants.js
└── popup/
    ├── popup.html
    └── popup.js
```

## How it works

1. **Email detection** — Polls Gmail inbox for emails without user-applied labels
2. **Metadata extraction** — Gets subject, sender, and snippet (no full body)
3. **Classification** — Scores labels using:
   - Subject similarity
   - Sender name/domain matching
   - Snippet similarity
   - Historical sender→label mappings
4. **Label application** — Applies the highest-scoring label if confidence exceeds threshold
5. **Learning** — Stores sender→label mappings for future emails

## Configuration

Edit `config/constants.js` to adjust:

- `POLL_INTERVAL_MINUTES` — How often to scan (default: 2)
- `MAX_EMAILS_PER_CYCLE` — Emails to process per run (default: 10)
- `MIN_CONFIDENCE_THRESHOLD` — Minimum score to apply a label (default: 55)
- `EXCLUDED_SENDER_MAPPING_DOMAINS` — Domains that won't get permanent mappings (Superhuman, LinkedIn, etc.)
- `MIN_LABEL_MATCH_LENGTH` — Minimum label length for subject/snippet matching (avoids false matches)

## Chrome built-in AI

The extension uses an offscreen document to run Chrome's Prompt API (Gemini Nano) when deterministic matching doesn't produce a confident result. Requirements:

- Chrome 138+
- 22+ GB free storage
- 16GB RAM + 4 cores, or 4GB+ VRAM

The popup shows AI status (Ready, Downloading, etc.). Add more domains to `EXCLUDED_SENDER_MAPPING_DOMAINS` if you see incorrect mappings from senders that send diverse content.

## License

MIT
