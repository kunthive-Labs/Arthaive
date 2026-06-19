# Backfill Handoff: 2020–2023 Indian Startup Funding Data

**Date written:** 2026-06-18  
**Repo:** `~/Documents/Beta/Arthaive` (git identity: `8harath` / `8harath.k@gmail.com` / SSH)  
**Goal:** Make `data/funding-data.ts` continuous from 2015–2026 by filling 2020, 2021, 2022, 2023.

---

## Current State

| Year | Status | Deals in dataset |
|------|--------|-----------------|
| 2015 | ✅ Done | 1,021 |
| 2016 | ✅ Done | 1,019 |
| 2017 | ✅ Done | 710 |
| 2018 | ✅ Done | 944 |
| 2019 | ✅ Done | 1,333 |
| **2020** | ✅ **DONE** | **1,263** |
| **2021** | ✅ **DONE** | **2,357** |
| 2022 | ⏳ Not started | 0 |
| 2023 | ⏳ Not started | 0 |
| 2024 | ✅ Done | 867 |
| 2025 | ✅ Done | 860 |
| 2026 | ✅ Done (partial) | 462 |
| **Total** | | **10,803** |

---

## ⚠️ CRITICAL: Subagents cannot write files (discovered 2021 session)

Extraction agents launched via the Agent tool run in a sandbox that **denies both the Write tool
and Bash heredoc writes** in background runs. The "agents print between markers" protocol the
prompt template below describes is correct in spirit, but in practice agents often still try to
Write and fail. **The fix: harvest the intended output from each agent's transcript.** The denied
Write call's `content` (and any text-draft JSONL) is preserved in the transcript file.

Use `pipeline/.work/harvest_transcripts.py <tasks_dir>`:
- `<tasks_dir>` = `/private/tmp/claude-*/<project>/<session-uuid>/tasks/` (the `.output` files).
- It regexes every `{...is_funding_event...}` object out of each transcript, `html.unescape`s,
  dedups by (company, url), and writes `pipeline/.work/<src>_<year>.claude.chunk_XX.jsonl`.
- It keys transcript → chunk via an explicit `MAPPING` dict of **agent-id → chunk filename**.
  Record each wave's launch agent IDs and update `MAPPING` before running. (Agents that attempt a
  Bash heredoc leave no Write `file_path` in the transcript, so the explicit map is required.)
- Add to each agent prompt: "If Write is denied, print all deal objects as JSONL between
  `<<<BEGIN_JSONL>>>` / `<<<END_JSONL>>>` markers" — the harvester catches those text blocks too.

Also note: there is **NO `pipeline.discovery --year` chunker** (the step below is wrong). Chunk
the needs_claude files with an ad-hoc python split at 130 articles/chunk into
`pipeline/.work/<src>_<year>.needs.chunk_XX.jsonl`.

---

## 2020 Backfill — COMPLETE

### What was done

1. **Crawled sitemaps** for all 3 sources → `/tmp/backfill/`
   - `cand_inc42_2020.jsonl` — 1,248 articles
   - `cand_entrackr_2020.jsonl` — 498 articles
   - `cand_yourstory_2020.jsonl` — 1,169 articles

2. **Bucketed** each source (rule-extract fast deals as `resolved`, AI queue as `needs_claude`):
   ```bash
   python -m pipeline.backfill_local --in /tmp/backfill/cand_<src>_2020.jsonl \
       --out-prefix /tmp/backfill/<src>_2020
   ```
   Resolved bucket written directly to `funding_data/` CSVs via `write_csv`.

3. **Chunked** `needs_claude` files into ~130-article chunks in `pipeline/.work/`:
   - Inc42: 7 chunks (chunk_00–06), ~867 articles total
   - Entrackr: 3 chunks (chunk_00–02), ~351 articles total
   - YourStory: 6 chunks (chunk_00–05), ~668 articles total

4. **Ran extraction agents** in 3 waves (all complete):
   - Wave 1: Inc42 chunks 00–05 (6 agents)
   - Wave 2: Inc42 chunk_06, Entrackr 00–02, YourStory chunk_00 (5 agents)
   - Wave 3: YourStory chunks 01–05 (5 agents)

5. **Parsed** each agent transcript → `pipeline/.work/<src>_2020.claude.chunk_XX.jsonl`

6. **Wrote** all chunks to CSV via `pipeline.write_csv`

7. **Cleaned + regenerated:**
   ```bash
   python -m pipeline.clean_backfill   # removed 13 junk rows (Jio mega-rounds, investor names as companies)
   npm run generate-data               # 8,447 deals
   npx tsc --noEmit                    # ✅ passes
   ```

### Extraction totals for 2020
| Source | Chunks | Raw extracted | Written to CSV |
|--------|--------|--------------|----------------|
| Inc42 | 7 | 363 | ~260 (after dedup) |
| Entrackr | 3 | 172 | ~111 (after dedup) |
| YourStory | 6 | 247 | ~185 (after dedup) |

Work files are in `pipeline/.work/` (gitignored, persistent).

---

## 2021 Backfill — Crawl Running at Handoff

### Crawl status (started 2026-06-18, may still be running)

```
/tmp/backfill/cand_entrackr_2021.jsonl  — 881 articles  ✅ DONE
/tmp/backfill/cand_yourstory_2021.jsonl — 2,559 articles ✅ DONE
/tmp/backfill/cand_inc42_2021.jsonl     — ~1,320+ articles (was ~95% done at handoff)
```

**Check if crawl is still running:**
```bash
pgrep -f "dump_candidates" && echo "still running" || echo "done"
tail -1 /tmp/backfill/crawl_inc42_2021.log
wc -l /tmp/backfill/cand_inc42_2021.jsonl
```

**If crawl died, resume with:**
```bash
cd ~/Documents/Beta/Arthaive
pipeline/.venv/bin/python -m pipeline.dump_candidates \
    --source inc42 --since 2021-01-01 --until 2021-12-31 \
    --out /tmp/backfill/cand_inc42_2021.jsonl --skip-existing \
    >> /tmp/backfill/crawl_inc42_2021.log 2>&1
```

### Next steps for 2021 (once crawl is done)

**Step 1 — Bucket all three sources:**
```bash
cd ~/Documents/Beta/Arthaive
PY=pipeline/.venv/bin/python
for src in inc42 entrackr yourstory; do
  $PY -m pipeline.backfill_local \
      --in /tmp/backfill/cand_${src}_2021.jsonl \
      --out-prefix /tmp/backfill/${src}_2021
done

# Write resolved bucket to CSV:
$PY -m pipeline.write_csv \
    --in /tmp/backfill/inc42_2021.resolved.jsonl \
        /tmp/backfill/entrackr_2021.resolved.jsonl \
        /tmp/backfill/yourstory_2021.resolved.jsonl
```

**Step 2 — Chunk the needs_claude files:**
```bash
$PY -m pipeline.discovery --year 2021
# Creates pipeline/.work/<src>_2021.needs.chunk_XX.jsonl at ~130 articles each
```

**Step 3 — Launch extraction agents (one per chunk, ≤16 concurrent):**

For each `pipeline/.work/<src>_2021.needs.chunk_XX.jsonl`, spawn an agent with this prompt:

```
You are a precise structured-data extractor for Indian startup funding deals.
Read the input file line by line and emit one JSON object per REAL funding deal.

INPUT FILE: /Users/bharath.bhaktha/Documents/Beta/Arthaive/pipeline/.work/<src>_2021.needs.chunk_XX.jsonl

Each line of the input is: {"url","title","pub_date":"YYYY-MM-DD","body"}

## Output format
Print your JSONL output between these exact markers (NO file writes — just print to stdout):
<<<BEGIN_JSONL>>>
{"is_funding_event":true,"company":str,"amount_value":number|null,"amount_currency":"USD"|"INR"|null,"amount_raw":str|null,"stage":str|null,"sectors":[str],"investors":[str],"lead_investor":str|null,"deal_date":"YYYY-MM-DD","location":str|null,"notes":str|null,"source_url":str}
<<<END_JSONL>>>

## Field rules
- amount_value = numeric in BASE UNITS. crore=1e7, lakh=1e5, Mn/million=1e6, Bn/billion=1e9.
  "$30 Mn"→30000000 USD; "Rs 40 crore"→400000000 INR. Undisclosed → null,null,"undisclosed"
- stage = one of: Pre-Seed, Seed, Pre-Series A, Series A..F, Bridge, Debt, Venture Debt, Pre-IPO, Acquisition, or null
- company = the STARTUP that RECEIVED the money (never the investor)
- deal_date = explicit date in body if given, else pub_date
- source_url = the candidate's "url" field

## DO NOT emit: Non-Indian companies, VC fund launches/closes, weekly roundup digests,
   advice/opinion/listicle posts, product launches, "in talks" rumors.
## DO emit: All confirmed closed rounds + notable acquisitions (even undisclosed amount).

After <<<END_JSONL>>>, print a 1-line summary: lines read; deals emitted; skipped (reason tally).
```

**Step 4 — Parse transcripts (run this Python snippet):**
```python
import json, html, os, re, glob

WORK = "pipeline/.work"
SUBDIR = sorted(glob.glob(os.path.expanduser(
    "~/.claude/projects/-Users-bharath-bhaktha-Documents-Beta-Arthaive/*/subagents")),
    key=os.path.getmtime)[-1]

def all_text(path):
    texts = []
    with open(path) as f:
        for line in f:
            try:
                obj = json.loads(line)
            except Exception:
                continue
            if obj.get("type") == "assistant":
                for block in obj.get("message", {}).get("content", []):
                    if block.get("type") == "text":
                        texts.append(block["text"])
    return "\n".join(texts)

def parse_block(block):
    deals = []
    for line in block.splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            obj = json.loads(html.unescape(line))  # html.unescape is MANDATORY
            if obj.get("is_funding_event") and "company" in obj:
                deals.append(obj)
        except Exception:
            pass
    return deals

def extract(agent_id, out_path):
    pattern = os.path.join(SUBDIR, f"agent-{agent_id}*.jsonl")
    candidates = glob.glob(pattern)
    if not candidates:
        print(f"  {agent_id}: NO TRANSCRIPT FOUND"); return 0
    path = sorted(candidates, key=os.path.getmtime)[-1]
    raw = all_text(path)
    blocks = re.findall(r'<<<BEGIN_JSONL>>>(.*?)<<<END_JSONL>>>', raw, re.DOTALL)
    if not blocks:
        print(f"  {agent_id}: NO JSONL BLOCK FOUND"); return 0
    best = max(blocks, key=lambda b: len(parse_block(b)))  # pick the biggest block
    deals = parse_block(best)
    with open(out_path, "w") as f:
        for d in deals:
            f.write(json.dumps(d) + "\n")
    print(f"  {agent_id}: {len(deals)} deals → {out_path}")
    return len(deals)

# Call for each completed agent:
# extract("agent_id_here", f"{WORK}/inc42_2021.claude.chunk_00.jsonl")
```

**Step 5 — Write to CSV and finalize:**
```bash
pipeline/.venv/bin/python -m pipeline.write_csv \
    --in pipeline/.work/<src>_2021.claude.chunk_XX.jsonl

# After ALL chunks for the year:
pipeline/.venv/bin/python -m pipeline.clean_backfill
npm run generate-data
npx tsc --noEmit
```

---

## 2022 and 2023 — Not Started

Run the identical process for each year:

```bash
cd ~/Documents/Beta/Arthaive

# Crawl (all three in parallel)
for src in inc42 entrackr yourstory; do
  pipeline/.venv/bin/python -m pipeline.dump_candidates \
      --source $src --since YYYY-01-01 --until YYYY-12-31 \
      --out /tmp/backfill/cand_${src}_YYYY.jsonl \
      > /tmp/backfill/crawl_${src}_YYYY.log 2>&1 &
done
# Then bucket → chunk → extract agents → parse → write CSV → clean → generate → tsc
```

---

## Architecture Reference

### Pipeline modules (all in `pipeline/`)
| Module | Purpose |
|--------|---------|
| `dump_candidates` | Crawls sitemaps, fetches article bodies → JSONL `{url, title, pub_date, body}` |
| `backfill_local` | Rule-extracts easy deals (→ resolved) and buckets rest as needs_claude |
| `discovery` | Splits needs_claude JSONL into ~130-article chunks in `pipeline/.work/` |
| `write_csv` | Writes extractor-schema JSONL into `funding_data/*/data.csv` with sig-dedup |
| `clean_backfill` | Removes blocklisted companies and amount-cap outliers from CSVs |

### Key conventions
- **Agent output protocol:** Agents CANNOT write files (sandbox restriction). They must print JSONL between `<<<BEGIN_JSONL>>>` and `<<<END_JSONL>>>` markers in their stdout/response.
- **Transcript parsing:** Always apply `html.unescape()` before JSON parsing — agents HTML-encode `&` in sectors/names.
- **Best-block selection:** If an agent emits multiple JSONL blocks (e.g., retrying a summary), pick the one with the most valid JSON objects.
- **SUBDIR resolution:** Always take the most recently modified subagents directory — `sorted(..., key=os.path.getmtime)[-1]`.
- **Amount units in agents:** Base units — USD dollars, INR rupees. Crore = 1e7, Mn = 1e6. `write_csv` converts to `$M` for storage.
- **Amount in `data/funding-data.ts`:** Stored in **lakhs**. The generate script handles the conversion.
- **Date format in CSV:** `DD/MM/YYYY`
- **Signature dedup:** `write_csv` deduplicates by URL and by `(company_slug, date)` pair across ALL existing CSVs — so order of writing doesn't matter; duplicates are caught automatically.
- **Chunk size:** 130 articles per chunk — agents time out on larger batches.

### Data sources
| Source | Sitemap type | Typical yearly volume |
|--------|-------------|----------------------|
| Inc42 | Paginated XML sitemaps | ~1,300 candidates/yr |
| Entrackr | Daily sitemaps | ~500–900 candidates/yr |
| YourStory | Weekly sitemaps | ~1,200–2,600 candidates/yr |

### Git identity (critical)
- Repo is under `~/Documents/Beta/` → always use `8harath / 8harath.k@gmail.com / SSH`.
- **Verify before every commit:** `git config user.email` must return `8harath.k@gmail.com`.
- **Stage only backfill files:** `data/funding-data.ts`, `funding_data/`, `pipeline/` (if edited).
- **Do NOT commit:** `PHASES.md`, `app/`, `components/`, `supabase/`, `.github/` — intentional WIP.

### /tmp/backfill durability warning
`/tmp/backfill/` is NOT durable across reboots. If the machine restarts, all candidate JSONL files are lost and crawls must be re-run. `pipeline/.work/` IS persistent (under repo, gitignored).

---

## Typical session opening checklist

```bash
cd ~/Documents/Beta/Arthaive

# 1. Verify git identity
git config user.email   # must be 8harath.k@gmail.com

# 2. Check current dataset state
python3 -c "
import csv, glob, re
counts = {}
for f in glob.glob('funding_data/**/data.csv', recursive=True):
    for row in csv.DictReader(open(f)):
        m = re.match(r'\d{2}/\d{2}/(\d{4})', row.get('Date',''))
        if m: counts[m.group(1)] = counts.get(m.group(1),0) + 1
[print(f'  {y}: {c:,}') for y,c in sorted(counts.items())]
"

# 3. Check if 2021 crawl files exist
ls -lh /tmp/backfill/cand_*_2021.jsonl 2>/dev/null || echo "crawl files missing — re-run dump_candidates"

# 4. Check if any pipeline/.work 2021 chunks exist
ls pipeline/.work/*2021* 2>/dev/null || echo "no 2021 work files yet"
```
