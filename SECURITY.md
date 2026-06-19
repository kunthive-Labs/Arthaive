# Security Policy

Arthaive is a small, pre-1.0 open-source project. We take security issues
seriously and appreciate responsible disclosure. This document explains how to
report a vulnerability and what to expect in return.

## Supported Versions

Arthaive ships continuously from `main` and has no long-term support branches.
Only the latest release is supported; please reproduce and report issues against
the current `main` / latest deployment.

| Version            | Supported          |
| ------------------ | ------------------ |
| Latest `main` / `0.1.x` | :white_check_mark: |
| Older commits / tags    | :x:                |

## Reporting a Vulnerability

**Please report security issues privately. Do NOT open a public GitHub issue,
pull request, or discussion for a suspected vulnerability** — that exposes the
problem to everyone before it can be fixed.

Use one of these private channels:

1. **GitHub private vulnerability reporting (preferred, if enabled):** Go to the
   repository's **Security** tab → **"Report a vulnerability"**
   (github.com/kunthive-Labs/Arthaive).
2. **Email:** [8harath.k@gmail.com](mailto:8harath.k@gmail.com)

Please include as much of the following as you can:

- A clear **description** of the issue.
- **Reproduction steps** (or a proof-of-concept).
- The **affected component or endpoint** (e.g. a specific API v1 route, the
  sign-in gate, an admin view, a Supabase query).
- The **impact** — what an attacker could do with it.

## What to Expect

This is a side project maintained by one person, so the timelines below are
best-effort, not a contractual SLA:

- We aim to **acknowledge your report within a few days**.
- We'll **keep you updated** on triage and remediation progress.
- Once a fix ships, we're happy to **credit you publicly** if you'd like
  (let us know how you'd prefer to be named).

There is **no bug bounty** and no monetary reward — just our thanks.

## Scope

Arthaive is a Next.js 16 (App Router, TypeScript) app on Vercel, backed by
Supabase (PostgreSQL + Supabase Auth via Google OAuth), exposing a public REST
API v1 with user-registerable API keys and rate limits.

**In scope** (examples):

- Authentication/authorization bypass on the **sign-in gate** or the **admin gate**.
- Exposure of secrets — e.g. the **Supabase service-role key**, OAuth secrets, or
  any other credential.
- **SQL injection** or other injection into the database layer.
- **API-key or rate-limit bypass** on the public REST API v1.
- **Cross-site scripting (XSS)** or other client-side injection.
- **Cross-user data leakage** — reading or modifying another user's bookmarks,
  watchlist, saved searches, or notes.

**Out of scope** (examples):

- Volumetric or distributed **denial-of-service (DoS)** attacks.
- **Social engineering**, phishing, or physical attacks against maintainers/users.
- Vulnerabilities in **third-party services themselves** (Supabase, Vercel,
  Google) — report those to the respective vendor.
- **Missing best-practice headers** or other hardening suggestions **without a
  demonstrated exploit**.

## Data Accuracy Is Not a Security Issue

A wrong funding amount, stage, investor, date, or a missing/incorrect source link
is a **data quality issue, not a security vulnerability**. Please don't use the
security channels for these. Instead, file a **Data correction** issue through the
normal issue template — see [CONTRIBUTING.md](./CONTRIBUTING.md) for details.
