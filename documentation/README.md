# Documentation

Welcome. If you are new to the India Startup Funding Intelligence Platform, read these in order. After all eleven, you will know what this product is, how it works, what the database looks like, how data gets in, how admins keep it clean, and what is still to be built.

| # | File | What you will learn |
|---|---|---|
| 1 | [01-overview.md](01-overview.md) | The product, its mission, who it serves, the eight design principles |
| 2 | [02-architecture.md](02-architecture.md) | The four layers — frontend, database, pipeline, AI — and how requests flow between them |
| 3 | [03-data-model.md](03-data-model.md) | Every table in the database, field by field, with the reason each exists |
| 4 | [04-pipeline.md](04-pipeline.md) | The Python pipeline that crawls news, extracts deals, and writes them to the database |
| 5 | [05-admin.md](05-admin.md) | The admin console — review queue, entity manager, sources, pipeline logs, import, export |
| 6 | [06-entity-resolution.md](06-entity-resolution.md) | How "Sequoia India" and "Peak XV" become the same investor in our system |
| 7 | [07-frontend.md](07-frontend.md) | The public-facing Next.js app — every page, where its data comes from |
| 8 | [08-getting-started.md](08-getting-started.md) | How to run the whole stack on your laptop |
| 9 | [09-roadmap.md](09-roadmap.md) | What is built, what is partial, what is ahead — the nine phases |
| 10 | [10-glossary.md](10-glossary.md) | Domain terms — stage, tier, canonical, confidence, record_status |

## Related top-level docs

- `PROJECT_REFERENCE.md` — the original product brief, the source of truth for the long-term vision.
- `PHASES.md` — the detailed nine-phase implementation plan with exit criteria.
- `README.md` — the repo's quick-start.
- `DEPLOYMENT.md` — how Vercel hosting is wired.

If anything in this folder contradicts `PROJECT_REFERENCE.md`, that doc wins — it is the spec. These pages are the explanation.
