---
name: market-research
description: Create local, source-grounded market research artifacts for ideas, companies, products, categories, competitors, substitutes, positioning, pricing, distribution, customer pain, traction, or strategic decisions. Use when the user wants a flexible research brief rather than a fixed competitor spreadsheet.
---

# Market Research

Create a local research artifact that helps the user make a decision. Keep the structure simple, but adapt the tables and fields to the actual question.

This skill is local-only: write files in the workspace and do not sync them anywhere.

## Artifact

Create one folder:

```text
.agents/artifacts/market-research-<slug>/
  RESEARCH.md
  sources.csv
  claims.csv
  tables/
    <question-specific>.csv
  notes.md
```

Required files:

- `RESEARCH.md` — the readable brief.
- `sources.csv` — source registry.
- `claims.csv` — audit trail for important factual claims, estimates, and inferences.

Optional files:

- `tables/*.csv` — adaptive tables that match the research question.
- `notes.md` — scratch notes, rejected angles, search log, and follow-up ideas.

Do not create a workbook, database, or deep folder tree unless the user asks for it.

## Start

First derive the research frame from the user's request:

- `target` — what is being researched.
- `target_type` — idea, company, product, category, market, competitor, customer segment, or trend.
- `decision_question` — what this should help decide.
- `scope` — geography, customer segment, time horizon, and depth.
- `known_context` — what the user already believes or provided.
- `assumptions` — what you are assuming because the user did not specify it.

If the decision question is unclear, make a reasonable assumption and state it. Ask only if different answers would require totally different research.

## Research Loop

1. Write the research frame into `RESEARCH.md`.
2. Browse for current facts. Do not rely on memory for live products, pricing, funding, launches, active status, user counts, regulations, or market changes.
3. Choose only the tables that answer the question. Examples:
   - `landscape.csv` for relevant entities and substitutes.
   - `feature-comparison.csv` for product capability comparison.
   - `pricing.csv` for pricing and packaging.
   - `positioning.csv` for how players describe themselves.
   - `customer-pain.csv` for reviews, complaints, jobs, and use cases.
   - `channels.csv` for distribution and acquisition patterns.
   - `market-sizing.csv` for TAM/SAM/SOM, adoption, and spend estimates.
4. Fill `sources.csv` as sources are used.
5. Fill `claims.csv` for important claims that affect the analysis.
6. Write the brief. Separate observed facts from interpretation.
7. Run the validator before finalizing.

## Parallel Subagents

Use subagents only when the user explicitly asks for parallel agents, subagents, delegation, or faster/deeper parallel research. Do not spawn agents for a normal lightweight brief.

The main agent owns:

- the research frame
- source ID assignment
- final `sources.csv`, `claims.csv`, adaptive tables, and `RESEARCH.md`
- resolving contradictions
- validation

Subagents are research scouts by default. They should not edit files unless the main agent gives them a disjoint file path. Prefer read-only packets over parallel file writes.

Default to 2 scouts when parallel research is useful:

- `market map scout` — find relevant companies, substitutes, categories, positioning, public pricing, packaging, and distribution signals.
- `customer scout` — find customer pain, reviews, complaints, use cases, and language.

Add a `business scout` only when the decision depends on traction, funding, market size, revenue model, GTM, or pricing depth.

Add a `skeptic scout` only for high-stakes or broad claims. Its job is to challenge the draft, find counterexamples, and flag weak evidence.

Do not use more than 3 scouts unless the user explicitly asks for a very broad research sweep. More lanes usually create synthesis drag and fake precision.

Give each scout a narrow prompt:

```text
Research lane: <lane>
Target: <target>
Decision question: <decision_question>
Scope: <scope>
Return only:
- findings: concise bullets
- sources: title | url | source_type | date_accessed | reliability | notes
- claims: claim | claim_type | subject | source_urls | confidence | status | notes
- suggested table columns, if useful
Do not write files.
Do not make strategy recommendations beyond this lane.
Mark unknowns instead of guessing.
```

Merge rules:

- Deduplicate sources before assigning `S1`, `S2`, etc.
- Put only decision-relevant claims into `claims.csv`.
- If scouts conflict, keep both claims and mark confidence lower until resolved.
- Do not paste scout output directly into the brief. Convert it into sourced analysis.
- If subagent work is thin, say so. Do not inflate weak research.
- Do not add a permanent lane registry, scoring system, queue, database, or orchestration layer.

## Fixed CSVs

`sources.csv` header:

```csv
source_id,title,url,source_type,publisher,date_accessed,reliability,notes
```

Use source IDs like `S1`, `S2`, `S3`.

`claims.csv` header:

```csv
claim_id,claim,claim_type,subject,source_ids,confidence,status,notes
```

Allowed values:

- `claim_type`: `fact`, `estimate`, `inference`, `open_question`
- `confidence`: `high`, `medium`, `low`, `unknown`
- `status`: `supported`, `weak`, `unsupported`, `unknown`, `open_question`

Use semicolons for multiple source IDs: `S1;S4`.

## Adaptive Tables

Tables under `tables/` should be designed for the question, not forced into a universal schema.

Rules:

- Give each table a clear name.
- Use concrete columns that help compare or decide.
- Include `source_ids`, `confidence`, and `notes` in every adaptive table.
- Prefer one useful table over five generic tables.
- Delete empty tables before finalizing.

Good adaptive columns:

```text
company,offer,target_user,pricing,distribution,traction_signal,why_it_matters,source_ids,confidence,notes
```

Bad adaptive columns:

```text
misc,details,analysis,more_details,other
```

## Brief Structure

`RESEARCH.md` should usually contain:

```markdown
# <Title>

## Research Frame

## Answer First

## What The Market Looks Like

## Key Evidence

## Analysis

## Implications

## Unknowns

## Next Research
```

Adjust headings when the user asks for a teardown, market map, category scan, or decision memo. Keep the main answer near the top.

## Evidence Standard

- Official sources first: company site, docs, pricing page, app-store listing, changelog, filings.
- Credible secondary sources second: funding databases, reputable press, analyst reports, industry reports.
- User sources third: reviews, Reddit, forums, social posts. Use these mainly for sentiment and complaints.
- Unknown beats guessed.
- Weak facts stay weak. Do not launder Reddit, directories, stale articles, or memory into confident claims.
- Quote sparingly. Paraphrase and cite the source ID.
- If a claim is strategic interpretation, label it as `inference`.
- If a fact is missing but important, record it as `open_question`.

## Writing Style

Be direct. No market-research theater.

Prefer:

- "The category is crowded on tracking, thin on verified follow-through."
- "Pricing is unclear from public pages."
- "This is an inference from positioning and customer reviews, not a proved fact."

Avoid:

- "This rapidly evolving landscape presents exciting opportunities."
- "The market is poised for disruption."
- "Comprehensive" unless the searched scope was actually comprehensive.

## Validation

Run:

```bash
node /Volumes/Misc/sick-skills/skills/market-research/scripts/validate-artifact.mjs .agents/artifacts/market-research-<slug>
```

Fix errors before finalizing. Warnings are allowed only when they are intentional and mentioned in the final answer.
