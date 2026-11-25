# Reference-based draft care plans

## Workflow and compatibility

New drafts use the `salveo-layout` document, version `1`. This identifies the
reference's layout, **not** the organisation providing care. Generate a draft,
review its evidence, download the editable HTML-based `.doc`, and complete it in
Word. Word edits do not sync back. There is no in-app document editor, signature
capture, consent workflow, automatic distribution, attachment creation or
retrospective conversion.

The existing organisation-scoped `html` text column holds both the controlled
HTML and its URI-encoded, validated structured document in a
`data-care-document` attribute. No schema/data migration is required. Application
metadata, selected funding, generation timestamp, mode, template/version and
organisation-configured rates are separate from transcript-derived content.
Unknown clinical values are explicitly `null`; unanswered optional output is
omitted. Existing extracted-facts JSON and the separate facts panel are unchanged.

On save, marked documents are validated, checked against the submitted client
name and rendered canonically. On display/export, marked documents are validated
and rendered; unmarked historical HTML is sanitized but not converted to the new
template. Invalid marked payloads and unsupported versions fail rather than
silently falling back to historical HTML. Future layout/content changes must
keep a version-aware reader/renderer for saved versions.

## Reference inventory and evidence mapping

`shared/care-plan-document.ts` contains the complete field-label inventory and
strict validation schema. Content is mapped as follows:

| Reference block | Source and conservative handling |
| --- | --- |
| Care Alerts | Transcript-supported alerts only; absence never means no allergies or no risks |
| My Care Plan | Client name from application input; plan date, involvement, preferred name, purpose, MAC ID, birth date, gender, address, birthplace, phone, email, Aboriginal/Torres Strait Islander identity and culture from transcript evidence |
| Communication/decision-making | Language/interpreter, communication needs, decision maker, guardian/POA paperwork, comments, advance directive, cultural values and worker/delivery preferences from evidence; no inferred capacity, paperwork or directive |
| Funding | Reported classification/management, funding status/supplements, additional support/remaining funds, AT-HM approval, AT/HM tiers, supplied AT-HM and pathways from evidence; selected funding/quarterly allocation displayed separately as application input, never approval |
| Life history/interests | Participant-reported narrative, first person where supported |
| Medical/medication | History/allergies, whether medicines are taken, medicine details, management, support, management-plan status, confirmed supplied attachment and authorisation from evidence; no inferred medication instructions |
| Mobility/equipment | Reported mobility/access, actual equipment and details; no inferred disability |
| Preferred providers | Unlimited rows of name, role/relation and number, with supported additional details |
| Informal supports/support network | Unlimited supporters with name, relationship, phone, email, address, role, organisation/contact instructions and separate explicit contact/disclosure permissions |
| Care team | Unlimited actual care partners, geriatricians, palliative-care contacts, nurses, pharmacists and others using the same repeatable contact structure |
| Additional support instructions | Non-response to scheduled visits, extreme emergencies and medical emergencies; no invented escalation instructions |
| Symptom management/comfort | Unlimited rows: concern; staff actions/timing; responsibility; when to call; review responsibility/timing |
| Goals | Unlimited numbered first-mentioned goals: goal; abilities/risks; tasks; responsibility; timing; cost; service category; start/review/reviewed/completed dates; achieved status; status comments; outcome; recommendations |
| Consent/distribution | Supported declaration/permissions/signer role/name and unlimited intended recipients; blank signature and signed-date areas are not consent |
| Prepared by/review | Supported name, role, date and review date; blank signature; **quarterly** default review cycle, with earlier review when needs change |
| Transcript Summary | Retained after prepared-by/review, using the existing Standards 1, 2, 3, 4, 5 and combined 6–8 mapping; headings survive without evidence |
| Dignity of Risk | Retained last, with narrative and six-column table: risk; client choice/decision; consequences; mitigation; acknowledgement; date. Unsupported cells stay blank, never “Yes” or “Today” |

The sample's 15 goals, four providers, annual dates, test people, signatures and
filenames are not defaults. No sample values or images are fed into generation.
No assertions of collaboration or provider CARE commitments are preprinted.
Provider CARE text/support contacts are explicit, organisation-ID-keyed
configuration in `server/services/carePlanTemplateConfig.ts`, empty until
approved by that organisation. They are never inferred from the layout's name.

## Generation safeguards

- The existing model (`gpt-6.2-sol`) is unchanged.
- All online endpoints use the same structured generator. Funding selections
  propagate through normal, streaming, asynchronous and offline paths.
- Raw transcripts are partitioned without dropping characters or removing
  clinically relevant times. No lossy summary is used for care-plan generation.
- Each part receives the ordered goal registry. Later discussion reuses the
  existing goal key and adds tasks/preferences/timing without replacing earlier
  details. A separate source-to-goal coverage pass checks for missed goals/details.
  Goals are ordered by their first supporting quote in the original transcript.
  Distinct keys remain distinct; there is no sample-derived cap.
- Exact source quotes are required for populated clinical fields and goals.
  Formatting-only whitespace, curly-quote and dash differences are matched back
  to the original source, and exact original excerpts are stored. Wording,
  negations, numbers and units are never fuzzily matched. Existing goal updates
  can retain their already-verified title, but new details require evidence from
  the current transcript part. A failed schema/evidence check receives one
  automatic correction attempt using the same model and source; it cannot
  silently drop a previously verified goal. Persistently unsupported output,
  incomplete responses and failed chunks stop generation explicitly; no partly
  generated clinical document is saved. Diagnostic logs contain field paths and
  failure categories, not participant data or source quotes.
- Only positive configured organisation rates are eligible for calculated costs.
  Missing rates omit costs. Monthly cost is rate × supported weekly hours ×
  4.33; no invented hours or rates. Funding selection is not a funding approval.
- Offline extraction is deliberately literal and more limited than AI:
  explicitly labelled answers, explicit personal equipment/allergy/medicine
  statements and explicit goal statements are retained. Explicitly named
  returns to an existing goal can add details. Keyword mentions alone do not
  establish diagnoses, risk severity, language needs, consent or authorisation.
  All offline drafts require verification against the original transcript.
- All new content is escaped. Legacy HTML is sanitized in preview, print,
  individual Word and bulk Word, inside the shared output boundary.

## Print/PDF and Word differences

All surfaces use the same document content and section order; there is no SCRBL
cover or prepended extracted-facts summary. The PDF action opens native print:
choose **Save as PDF**. This preserves selectable text and avoids tall-canvas
truncation. Use a current Chrome/Edge browser (Chromium 131+) for CSS page-margin
headers, confidentiality/support footers and page counters. Older print engines
may require enabling their own headers/footers and may not repeat custom
support details. A4 page rules reserve safe margins. Long rows can split when
they exceed a page; table header groups repeat.

Word remains editable HTML packaged as `.doc`, not native DOCX. Word may show its
usual format/extension warning; it can be saved as `.docx` after opening. Real
paragraphs and table cells can be edited and new details added. Named Word page
sections and Office footer/page fields are included. Different Word versions
can paginate tables differently from the browser/PDF; exact page equivalence
and PDF-style decoration are not promised.

## Verification

- `npm run test:care-plan`: sparse/full documents; zero/one/21+ goals; late goals;
  repeated goals with added detail; many providers; missing consent/signatures/
  rates; evidence validation; hostile text; version failures; round trips; model
  preservation; chunk failure and complete source coverage.
- `npm run test:care-plan-browser`: actual new/saved preview components;
  sanitized legacy/new print HTML; individual/bulk Word; collision-safe ZIP
  filenames; editable HTML paragraphs/cells/additions; A4 PDF with long goals;
  every-page client header, confidentiality/support footer and numbering;
  extracted-text checks for lost goal content.
  Requires Chromium 131+ and Poppler (`pdftotext`). An optional browser executable
  can be passed to `node scripts/check-care-plan-browser.mjs <executable>`.
- `npx tsx scripts/check-care-plan-live.ts`: explicit, paid synthetic smoke check
  on the existing model. Does not use actual client data or perform DB writes.
  Add `--long` to exercise a multi-part transcript and a later update to an
  already-verified goal.
- `npm run check` and `npm run build`.

The synthetic reference and representative PDF pages were visually compared.
Generated fixtures stay in ignored `generated-artifacts/`, not in Git or
deployment output. Microsoft Word itself is not installed in this environment:
HTML editability/structure and Word-specific markup were checked, but an actual
interactive Word session was not verified. Signed-in application pages were
tested as isolated components with synthetic responses, not by bypassing app
authentication. No real saved plan was rewritten and no production deployment
was performed.
