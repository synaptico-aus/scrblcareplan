---
name: Clinical evidence corrections
description: Safety rationale for keeping citation repair separate from clinical drafting
---

Keep citation-only corrections separate from clinical content generation. Preserve verified goals, clinical values and matched evidence; do not make unsupported quotes pass with approximate wording.

**Why:** A production correction that rewrote an entire draft fixed one risk citation but introduced invalid goal citations. Regeneration is not a safe way to make a local citation repair. Approximate matching could also erase clinically meaningful negation, quantities or qualifications.

**How to apply:** Let the model select supporting source passages and let the application copy their original text. Reject unsupported or malformed repairs rather than drop real goals, invent evidence or save a partial plan. Matching a source passage proves its provenance, not clinical relevance; keep the explicit-support instructions and clinical-review requirement.

For goal updates, distinguish previously verified context from newly asserted details when requesting citation repairs. A title inherited from a verified earlier pass is not a new assertion requiring repetition in the current transcript part.

**Why:** Requiring current-part support for inherited context can reject legitimate updates even when the new detail has explicit evidence. This exemption must not apply to newly supplied titles or details.

**How to apply:** Preserve the verified title in the final draft, exclude only genuinely inherited titles from current-part repair targets, and continue requiring current-part support for all newly supplied details.

Use source-passage selection from initial drafting and goal auditing, not just as a repair strategy. The application, not the model, must copy original evidence excerpts. Keep IDs internal and preserve normal editable care-plan output.

**Why:** The user approved this approach after repeated live failures caused by nonmatching quotes. Source labelling alone did not solve that failure mode. Passage selection removes quote-copying errors but is not independent proof of clinical relevance.

**How to apply:** Keep selections scoped to the current input part, reject missing or unknown support, retain bounded correction and clinical review, and do not introduce extra paid stages merely to account for evidence.
