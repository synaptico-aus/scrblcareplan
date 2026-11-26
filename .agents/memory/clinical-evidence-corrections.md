---
name: Clinical evidence corrections
description: Safety rationale for keeping citation repair separate from clinical drafting
---

Keep citation-only corrections separate from clinical content generation. Preserve verified goals, clinical values and matched evidence; do not make unsupported quotes pass with approximate wording.

**Why:** A production correction that rewrote an entire draft fixed one risk citation but introduced invalid goal citations. Regeneration is not a safe way to make a local citation repair. Approximate matching could also erase clinically meaningful negation, quantities or qualifications.

**How to apply:** Let the model select supporting source passages and let the application copy their original text. Reject unsupported or malformed repairs rather than drop real goals, invent evidence or save a partial plan. Matching a source passage proves its provenance, not clinical relevance; keep the explicit-support instructions and clinical-review requirement.
