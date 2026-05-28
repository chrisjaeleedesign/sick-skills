---
name: creator-content-scrape-store
description: Operate the local creator-content scrape store for X and Instagram ingestion, raw snapshot replay, media caching, corpus exports, and store health checks. Use when the user wants to scrape creator posts, import Bright Data/CSV/JSON creator data, resume Bright Data snapshots, refresh metrics, download/prune media, inspect local creator inventory, or prepare data for creator-content-autopsy G/S/B analysis.
---

# Creator Content Scrape Store

## Tool Location

The implementation lives in Pebble Studios:

```bash
/Volumes/Misc/pebble-studios/.agents/artifacts/creator-content-scrape-store
```

Use the wrapper from `/Volumes/Misc/pebble-studios`:

```bash
.agents/artifacts/creator-content-scrape-store/bin/creator-scrape-store doctor
```

Default durable data root:

```text
/Volumes/Misc/pebble-studios/.agents/data/creator-content-store/
```

## First Checks

Before live scraping:

```bash
.agents/artifacts/creator-content-scrape-store/bin/creator-scrape-store doctor
.agents/artifacts/creator-content-scrape-store/bin/creator-scrape-store doctor --require-brightdata-key
.agents/artifacts/creator-content-scrape-store/bin/creator-scrape-store preflight --projected-media-bytes 500000000
```

If the Bright Data key is missing, ask the user to add `BRIGHTDATA_API_KEY` to the shell environment or a `.env` file in the current working directory. Never print the key.

## Common Workflows

Import saved X records:

```bash
.agents/artifacts/creator-content-scrape-store/bin/creator-scrape-store import-x-json --file /path/to/x.json
```

Scrape known X status URLs:

```bash
.agents/artifacts/creator-content-scrape-store/bin/creator-scrape-store scrape-x-urls --url 'https://x.com/thedankoe/status/1926662090137182690'
```

Scrape Instagram profile Reels:

```bash
.agents/artifacts/creator-content-scrape-store/bin/creator-scrape-store scrape-instagram-reels --profile benjaminkielesinski --num-posts 20
```

Inspect and export:

```bash
.agents/artifacts/creator-content-scrape-store/bin/creator-scrape-store list-runs
.agents/artifacts/creator-content-scrape-store/bin/creator-scrape-store show-creator-inventory
.agents/artifacts/creator-content-scrape-store/bin/creator-scrape-store export-corpus --output exports/corpus.jsonl --format jsonl --eligible-only
```

## Guardrails

- Do not store durable scrape data outside `/Volumes/Misc/pebble-studios` unless the user explicitly asks.
- Treat metrics as append-only observations; repeated scrapes should add dated metric rows, not overwrite history.
- Preserve raw records and snapshot IDs before normalization.
- Use `replay-run` after normalizer changes instead of paying for a new scrape.
- Download full media only when needed; use `prune-media` under disk pressure.
