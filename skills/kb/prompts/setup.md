# Setup

Walk the user through getting `gws` installed, authenticated, and connected to a Drive folder. Go step by step — verify each step succeeds before moving to the next.

## Step 1: Check gws and dependencies

Run `python3 <skill-dir>/scripts/kb.py check` to see the current state. The output includes:
- `installed` — whether `gws` CLI is available
- `authenticated` — whether gws has valid credentials
- `gcloud` — whether Google Cloud SDK (`gcloud`) is available (needed for `gws auth setup`)

If **gws is not installed**, present these options and let the user pick:
- `brew install googleworkspace-cli` (macOS, recommended)
- `npm install -g @googleworkspace/cli`
- Download from https://github.com/googleworkspace/cli/releases

If **gcloud is not installed**, it's needed for the auth step. Present:
- `brew install --cask google-cloud-sdk` (macOS, recommended)
- https://cloud.google.com/sdk/docs/install

After they install, re-run the check to confirm both are available.

If **installed but not authenticated**, go to Step 2.

If **installed and authenticated**, go to Step 3.

## Step 2: Authenticate

These commands require browser interaction — the user needs to run them:

1. `gws auth setup` — creates a GCP project and enables APIs. The user follows browser prompts.
2. `gws auth login` — opens a browser for OAuth consent.

After both complete, verify auth actually works by making a real API call:
```
gws drive files list --params '{"pageSize": 1}'
```

If this returns a result (even empty), auth is working. If it errors, ask the user to check their browser for pending prompts or re-run `gws auth login`.

Don't rely only on `kb.py check` for auth verification — `gws auth status` can report success even when scopes are insufficient.

## Step 3: Connect a folder

Ask the user for their Google Drive folder URL or folder ID.

Accept either format:
- Full URL: `https://drive.google.com/drive/folders/abc123xyz` — extract `abc123xyz`
- Raw ID: `abc123xyz`

Validate by running: `python3 <skill-dir>/scripts/kb.py list-folder --folder-id <extracted-id>`

If it fails, the folder may not exist or the authenticated account may not have access. Ask the user to verify the URL and check sharing permissions.

If it succeeds, save the config:
```
python3 <skill-dir>/scripts/kb.py config --folder-id <id> --folder-url <url>
```

Then immediately run the update flow — read and follow `prompts/update.md`.

## Re-entry

If the user already has a config (`.agents/kb/config.json` exists) but auth has expired, skip straight to Step 2. Don't re-ask for the folder.
