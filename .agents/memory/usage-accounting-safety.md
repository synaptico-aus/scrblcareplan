---
name: Usage accounting safety
description: Billing correctness and privacy boundaries for actual token usage
---

Use provider-reported counts for actual usage, and distinguish estimated currency amounts from invoices. Reasoning tokens are included in completion/output tokens, never an additional billable quantity.

**Why:** The user chose actual usage tracking rather than a transcript-length calculator to understand the real cost of their multi-call care-plan workflow.

**How to apply:** Include corrections and retries when usage is reported. Unknown usage must not appear free, and an accounting failure must never cause a paid generation call to be repeated. Record only usage metadata, not client names, transcript text or clinical responses; scope access to the signed-in user and organisation.
