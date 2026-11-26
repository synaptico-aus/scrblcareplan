---
name: Schema default semantics
description: Why validation-library upgrades need sparse-document round-trip checks
---

Preserve parsed nested defaults when changing validation-library versions.
Sparse clinical documents must normalize identically before and after saving.

**Why:** Zod 4 defaults short-circuit parsing, unlike Zod 3. Defaulting an
object to an empty object can therefore omit nested nulls on first parse,
then add them when a saved document is read again.

**How to apply:** For defaults intended as parser input, use pre-parse defaults
rather than output defaults. Keep a regression asserting that parsing already
parsed sparse content does not change it. Never weaken clinical validation to
make a dependency upgrade pass.
