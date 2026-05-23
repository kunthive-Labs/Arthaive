# 01 — What is this product?

## In one sentence

A free, source-backed, India-focused database of startup funding rounds that you can search, browse, and analyze — every record traceable to the news article it came from.

## The problem we are solving

If you are a founder, investor, journalist, or analyst trying to understand the Indian startup ecosystem, you have two options today:

- **Paid platforms** like Tracxn and Crunchbase. They are comprehensive globally but shallow on India, and they cost thousands of dollars a year.
- **News scraping by hand.** Open Entrackr, Inc42, YourStory, scroll for hours, copy data into a spreadsheet, lose track of sources.

There is no free, structured, India-first option that lets you ask "show me every Series A in fintech from Q1 2026" or "which investors backed the most edtech rounds last year" without paying or doing it manually.

This product is that option.

## What we are not

- **Not a news site.** We do not write articles. We extract structured data from articles other people write.
- **Not a clone of Crunchbase.** We focus on India and we keep things free. We do not chase global coverage.
- **Not unverified data.** Every record links back to the source article. If a number is wrong, you can click through and check.

## Who it is for

| Audience | What they get |
|---|---|
| Founders | Benchmark valuations, find investors active in your sector |
| Investors | Track competitors, scout pipeline, validate market trends |
| Journalists | Look up a startup's funding history in seconds |
| Analysts and researchers | Pull aggregate stats by sector, stage, city, year |
| Students | Learn how the ecosystem moves without paying for a database |

## The eight design principles

These are the rules every feature decision is measured against. They come from `PROJECT_REFERENCE.md §5`.

| # | Principle | What it means in practice |
|---|---|---|
| **P1** | Source-backed data | Every funding event in the public dataset has at least one source URL. No sourceless records. |
| **P2** | Canonical identity | One startup = one row, one investor = one row. Aliases ("Sequoia India" → "Peak XV") map to canonical names so dedup actually works. |
| **P3** | Normalized structure | Startups, rounds, investors, sources are separate tables joined by foreign keys. Not one fat spreadsheet. |
| **P4** | Incremental updates | The pipeline runs daily and adds new records. It never rebuilds the dataset from scratch. |
| **P5** | Human verification | Pipeline-extracted records pass through a review queue. High-confidence ones auto-approve; the rest wait for an admin. |
| **P6** | Explainable analytics | Every chart traces to the underlying rows. If you cannot show the deals behind a number, the chart does not ship. |
| **P7** | Cost efficiency | AI calls are reserved for cases regex cannot handle and for high-value summaries. We do not Claude-every-line. |
| **P8** | Honest data labeling | We disclose coverage gaps. Charts show date ranges. The UI tells users what is verified versus what is estimated. |

If you ever feel a decision drifting from one of these, push back. They are load-bearing.

## What "100% done" looks like

From `PROJECT_REFERENCE.md §3`:

- Crawls Entrackr, Inc42, YourStory, MoneyControl daily.
- Every Indian startup that raised money has a canonical record with full round history.
- Search, filters, analytics, and reports all work from live database queries.
- A Public API v1 with rate limiting is open for researchers and journalists.
- The platform stays free.

We are roughly halfway there. See [09-roadmap.md](09-roadmap.md) for what remains.
