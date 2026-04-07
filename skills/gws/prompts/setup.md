# Setup

Walk the user through getting `gws` installed, authenticated, and verified. Go step by step — verify each step succeeds before moving to the next.

## Step 1: Check dependencies

Run these checks:

```bash
which gws
which gcloud
```

**If gws is not installed**, present options:
- `brew install googleworkspace-cli` (macOS, recommended)
- `npm install -g @googleworkspace/cli`

**If gcloud is not installed** (needed for auth setup):
- `brew install --cask google-cloud-sdk` (macOS, recommended)
- https://cloud.google.com/sdk/docs/install

After install, re-check both are available.

## Step 2: Authenticate

These commands open a browser — the user needs to run them:

1. **`gws auth setup`** — creates a GCP project and enables APIs. The user follows browser prompts.
2. **`gws auth login`** — opens browser for OAuth consent.

If the user only needs specific services, they can scope access: `gws auth login -s drive,docs,sheets`

## Step 3: Verify

Don't just check `gws auth status` — make a real API call to confirm scopes are sufficient:

```bash
gws drive files list --params '{"pageSize": 1}'
```

If this returns a result (even empty files list), auth is working. If it errors, ask the user to:
- Check their browser for pending OAuth prompts
- Re-run `gws auth login`
- Verify the GCP project has the required APIs enabled

## Re-entry

If the user was previously set up but auth expired (exit code 2 from any gws command), skip to Step 2. They don't need to reinstall.
