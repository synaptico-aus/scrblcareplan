import { z } from "zod";
import { assessmentSourceLabels } from "./assessment-sources";

// Labels are the reference's fields, not sample answers. Null is an unanswered field.
export const fieldGroups = {
  profile: {
    planDate: "Date of this Care Plan", involved: "People involved in developing My Care Plan", fullName: "Full Name", preferredName: "Preferred Name",
    purpose: "Purpose of this Care Plan", macId: "My Aged Care Reference ID", dob: "Date of Birth",
    gender: "Gender Identity", address: "Address", birthplace: "Place of Birth", phone: "Phone Number", email: "Email",
    indigenous: "Aboriginal or Torres Strait Islander?", culture: "Cultural Background",
    languages: "Preferred Language/s", interpreter: "Is an interpreter or translator required?",
    communication: "Communication Requirements", decisionMaker: "Person Responsible for making decisions",
    attorneyPaperwork: "If there is a Guardian or Power of attorney, a copy of the power of attorney paperwork has been provided",
    attorneyComments: "Comments about Guardian or Power of attorney", directive: "Is there an Advance Care Directive in place?",
    directiveComments: "Comments about Advance Care Directive",
    values: "Things To Consider About My Cultural, Diversity, Values and Belief",
    worker: "My care worker preferences", delivery: "My care worker, communication and service delivery preferences",
  },
  funding: {
    classification: "Classification Level", management: "Care Management Type",
    status: "Current funding status under the Support at Home Program",
    supplements: "Applicable Supplements or Additional Funding",
    additional: "Is additional support or the use of remaining funds from the home care package needed?",
    additionalDetails: "Details of additional supports needed",
    athmApproved: "Has the participant been approved to receive assistive technology or home modifications",
    atTier: "Assistive Technology Funding Tier", hmTier: "Home Modification Funding Tier",
    athm: "Assistive Technology & Home Modifications (AT-HM) the participant is receiving",
    pathways: "Has the participant been approved for any pathways?",
  },
  history: { family: "Family Background and Life History", interests: "Interests" },
  medical: { history: "My Medical History", allergies: "Allergies and Alerts" },
  medication: {
    takes: "Does the participant take any medication?", medications: "Medication",
    managed: "How is medication managed?", support: "Medication Support Required",
    plan: "Is there medication management plan in place?", attachment: "Upload a copy of the medication management plan",
    authorisation: "Medication support authorisation",
  },
  mobility: { access: "My Mobility and Access in the Community and Healthcare", equipment: "Equipment I currently have", details: "Details" },
  emergency: {
    nonResponse: "If I do not answer during a scheduled visit (NRSV -non-response to scheduled visit)",
    disaster: "Actions due to an extreme emergency event (flood / fire / outbreak)",
    medical: "Actions In the instance of a medical emergency",
  },
  consent: { declaration: "Care plan consent", distribution: "Distribution permissions", signerRole: "Role of person signing", printName: "Print Name" },
  prepared: { name: "Name", role: "Role", date: "Date", review: "Date Care Plan is due for review" },
} as const;

const unknownText = z.string().nullable().default(null);
function textShape<T extends Record<string, string>>(labels: T): { [K in keyof T]: typeof unknownText } {
  return Object.fromEntries(Object.keys(labels).map(k => [k, unknownText])) as { [K in keyof T]: typeof unknownText };
}
function fieldsSchema<T extends Record<string, string>>(labels: T) {
  return z.object(textShape(labels)).strict().prefault({} as any);
}
export const goalLabels = {
  title: "Goal", abilities: "Abilities and Considerations (Risks)", tasks: "How will we do this? (Tasks)",
  responsible: "Who is responsible?", timing: "When will it be done? (time, day, frequency)",
  category: "Service Category", start: "Start Date", review: "Review Date",
  reviewed: "Date of Review", status: "Has this goal been achieved? (Status)", comments: "Comments (in relation to status)",
  completed: "Date Completed", outcome: "Outcome of review or assessment", recommendations: "Recommendations",
};
export const goalSchema = z.object({
  key: z.string().min(1), ...textShape(goalLabels),
  evidence: z.array(z.string()).default([]),
  service: unknownText, hoursPerWeek: z.number().positive().nullable().default(null),
}).strict();
const personSchema = z.object({
  name: unknownText, relationship: unknownText, phone: unknownText, email: unknownText, address: unknownText,
  role: unknownText, organisation: unknownText, whenToContact: unknownText,
  contactPermission: unknownText, disclosurePermission: unknownText,
}).strict();
const comfortSchema = z.object({
  concern: unknownText, actions: unknownText, responsible: unknownText, call: unknownText, review: unknownText,
}).strict();
const riskSchema = z.object({
  risk: unknownText, choice: unknownText, consequences: unknownText, mitigation: unknownText,
  acknowledgement: unknownText, date: unknownText,
}).strict();
export const standards = [
  "Standard 1 – Consumer dignity and choice",
  "Standard 2 – Ongoing assessment and planning with consumers",
  "Standard 3 – Personal care and clinical care",
  "Standard 4 – Services and supports for daily living",
  "Standard 5 – Organisation's service environment",
  "Standards 6–8 – Feedback & complaints; Human resources; Organisational governance",
];
const groupSchemas = {
  profile: fieldsSchema(fieldGroups.profile), funding: fieldsSchema(fieldGroups.funding),
  history: fieldsSchema(fieldGroups.history), medical: fieldsSchema(fieldGroups.medical),
  medication: fieldsSchema(fieldGroups.medication), mobility: fieldsSchema(fieldGroups.mobility),
  emergency: fieldsSchema(fieldGroups.emergency), consent: fieldsSchema(fieldGroups.consent),
  prepared: fieldsSchema(fieldGroups.prepared),
};
export const clinicalContentSchema = z.object({
  ...groupSchemas,
  alerts: z.array(z.string()).default([]), informalSupports: unknownText,
  providers: z.array(personSchema).default([]), supporters: z.array(personSchema).default([]),
  careTeam: z.array(personSchema).default([]), comfort: z.array(comfortSchema).default([]),
  goals: z.array(goalSchema).default([]), recipients: z.array(personSchema).default([]),
  summary: z.array(unknownText).length(6).default([null, null, null, null, null, null]),
  riskNarrative: unknownText, risks: z.array(riskSchema).default([]),
  // Exact transcript excerpts by content path; never printed as additional document sections.
  evidence: z.record(z.string(), z.array(z.string())).default({}),
}).strict();
export const carePlanDocumentSchema = z.object({
  template: z.literal("salveo-layout"), version: z.literal(1), clientName: z.string().min(1),
  metadata: z.object({
    generatedAt: z.string().datetime(), mode: z.enum(["ai", "offline"]),
    reviewCycle: z.literal("Quarterly (every 3 months)"),
    selectedFunding: z.string().nullable(),
    rates: z.array(z.object({ service: z.string(), hourlyRate: z.number().positive() })),
    // Provider-specific wording is opt-in configuration, never inferred from the layout.
    organisationName: z.string().nullable().default(null),
    careWording: z.string().nullable().default(null), supportPhone: z.string().nullable().default(null),
    supportEmail: z.string().nullable().default(null),
    sourceEvidence: z.array(z.object({
      path: z.string(), quote: z.string(),
      kinds: z.array(z.enum(["ai_notes", "transcript", "unclassified"])).min(1),
    }).strict()).optional(),
  }).strict(),
  content: clinicalContentSchema,
}).strict();
export type CarePlanDocument = z.infer<typeof carePlanDocumentSchema>;
export type ClinicalContent = z.infer<typeof clinicalContentSchema>;
export type CareGoal = z.infer<typeof goalSchema>;
export const escapeText = (value: string): string => value.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const present = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;

export function createCarePlanDocument(clientName: string, mode: "ai" | "offline", content: unknown = {}, selectedFunding: string | null = null): CarePlanDocument {
  return carePlanDocumentSchema.parse({
    template: "salveo-layout", version: 1, clientName,
    metadata: { generatedAt: new Date().toISOString(), mode, reviewCycle: "Quarterly (every 3 months)", selectedFunding, rates: [] },
    content,
  });
}
export function readCarePlanDocument(html: string): CarePlanDocument | null {
  const encoded = html.match(/data-care-document="([^"]*)"/);
  if (!encoded) return null;
  return carePlanDocumentSchema.parse(JSON.parse(decodeURIComponent(encoded[1])));
}

function fields(labels: Record<string, string>, values: Record<string, unknown>): string {
  const entries = Object.entries(labels).filter(([k]) => present(values[k]));
  const rows: string[] = [];
  const fullWidthKeys = new Set(["involved", "communication", "decisionMaker", "attorneyPaperwork", "attorneyComments", "directiveComments", "values", "worker", "delivery", "family", "interests", "history", "allergies", "managed", "support", "attachment", "access", "details", "nonResponse", "disaster", "medical", "title", "abilities", "tasks", "outcome", "recommendations", "comments", "contactPermission", "disclosurePermission", "declaration"]);
  const wide = ([key]: [string, string]) => fullWidthKeys.has(key) || (values[key] as string).length > 350;
  for (let i = 0; i < entries.length;) {
    const paired = !wide(entries[i]) && entries[i + 1] && !wide(entries[i + 1]);
    const cells = entries.slice(i, i + (paired ? 2 : 1));
    rows.push(`<tr>${cells.map(([k, label]) => `<td${paired ? "" : ' colspan="2"'}><strong>${escapeText(label)}</strong><p>${escapeText(values[k] as string)}</p></td>`).join("")}</tr>`);
    i += cells.length;
  }
  return rows.length ? `<table class="field-grid"><tbody>${rows.join("")}</tbody></table>` : "";
}
function section(title: string, body: string, required = false): string {
  return body || required ? `<section><h2>${escapeText(title)}</h2>${body}</section>` : "";
}
function clinicalTable(labels: string[], rows: (string | null)[][], blank = false): string {
  const filtered = rows.filter(row => row.some(present));
  if (!filtered.length && !blank) return "";
  return `<table class="clinical-table"><thead><tr>${labels.map(l => `<th>${escapeText(l)}</th>`).join("")}</tr></thead><tbody>${(filtered.length ? filtered : [labels.map(() => null)]).map(row => `<tr>${row.map(cell => `<td>${present(cell) ? escapeText(cell) : "&nbsp;"}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}
const personLabels = { name: "Name", relationship: "Role/Relation", phone: "Contact Number", email: "Email", address: "Address", role: "Role", organisation: "Name of Organisation", whenToContact: "When should this care team member be contacted?", contactPermission: "Permission to contact regarding", disclosurePermission: "Permission to share details" };

export function renderCarePlanDocument(input: CarePlanDocument): string {
  const doc = carePlanDocumentSchema.parse(input);
  const c = doc.content as ClinicalContent & Record<string, any>;
  const f = (key: keyof typeof fieldGroups) => fields(fieldGroups[key], c[key]);
  const people = (items: z.infer<typeof personSchema>[]) => items.map(p => fields(personLabels, p)).join("");
  const goals = c.goals.map((g, i) => {
    const rate = doc.metadata.rates.find(r => r.service.toLowerCase() === g.service?.toLowerCase());
    const cost = rate ? `${rate.service} at $${rate.hourlyRate.toFixed(2)}/hour${g.hoursPerWeek ? ` ($${(rate.hourlyRate * g.hoursPerWeek * 4.33).toFixed(2)}/month)` : ""}` : null;
    return `<div class="goal"><h3>GOAL ${i + 1}</h3>${fields(goalLabels, g)}${cost ? fields({ cost: "How much will it cost?" }, { cost }) : ""}</div>`;
  }).join("");
  const signature = `<table class="field-grid signature"><tbody><tr><td><strong>Participant or Support Person's Signature</strong><p>&nbsp;</p></td><td><strong>Date Signed</strong><p>&nbsp;</p></td></tr></tbody></table>`;
  const sourceEvidence = doc.metadata.sourceEvidence;
  const body = [
    section("Care Alerts", c.alerts.map(a => `<p>${escapeText(a)}</p>`).join("")),
    `<h1>My Care Plan</h1><p class="draft-status">DRAFT — Ready for clinical review${doc.metadata.mode === "offline" ? " · Offline draft: verify transcript details" : ""}</p>`,
    fields({ generated: "Draft generated", version: "Version History" }, { generated: doc.metadata.generatedAt.slice(0, 10), version: "1" }),
    sourceEvidence ? `<p class="completion-note">Source review required: this draft uses both AI-written notes and original transcript text. AI notes are secondary claims, not verbatim participant statements or confirmation of consent. Check the Evidence Sources appendix and resolve discrepancies before approval.</p>` : "",
    doc.metadata.careWording ? `<p>${escapeText(doc.metadata.careWording)}</p>` : "",
    f("profile"), f("funding"),
    doc.metadata.selectedFunding ? fields({ selected: "Selected funding (application input; not confirmation of approval)" }, { selected: doc.metadata.selectedFunding }) : "",
    section("Important things to know about me", f("history")),
    section("My Medical Information", f("medical")), section("Medication Management", f("medication")),
    section("Mobility and Equipment", f("mobility")),
    section("My Preferred Service Providers",
      clinicalTable(["Name", "Role/Relation", "Contact Number"], c.providers.map(p => [
        p.name, [p.role, p.relationship].filter(present).join(" / ") || null, p.phone,
      ])) + c.providers.map(p => fields({
        name: "Name", email: "Email", address: "Address", organisation: "Name of Organisation",
        whenToContact: "When should this provider be contacted?", contactPermission: "Permission to contact regarding", disclosurePermission: "Permission to share details",
      }, p.email || p.address || p.organisation || p.whenToContact || p.contactPermission || p.disclosurePermission ? p : {})).join("")),
    section("Informal Supports", present(c.informalSupports) ? `<p>${escapeText(c.informalSupports)}</p>` : ""),
    section("My Support Network", people(c.supporters)), section("My Care Team", people(c.careTeam)),
    section("Additional Instructions for Support", f("emergency")),
    section("Symptom Management and Comfort Care", clinicalTable(["What is the concern or care need?", "What will staff do, and when?", "Who is responsible?", "When should staff call?", "Who will review this, and when?"], c.comfort.map(r => [r.concern, r.actions, r.responsible, r.call, r.review]))),
    section("My Goals", goals),
    section("Care Plan Consent and Distribution", `<p class="completion-note">For manual completion. A blank field does not indicate consent.</p>${f("consent")}${signature}${people(c.recipients)}`, true),
    section("Care Plan Prepared By", `${f("prepared")}${fields({ cycle: "Default review cycle" }, { cycle: doc.metadata.reviewCycle })}<p>Review may be requested earlier if needs or circumstances change.</p><p>Care Partner's Signature: ______________________________</p>`, true),
    section(`Transcript Summary – ${doc.clientName}`, standards.map((s, i) => `<h3>${escapeText(s)}</h3><p>${present(c.summary[i]) ? escapeText(c.summary[i]!) : "&nbsp;"}</p>`).join(""), true),
    section("Dignity of Risk Assessment", `<h3>Narrative</h3><p>${present(c.riskNarrative) ? escapeText(c.riskNarrative) : "&nbsp;"}</p>${clinicalTable(["Risk identified", "Client’s choice / decision", "Potential consequences", "Mitigation strategies", "Acknowledgement", "Date"], c.risks.map(r => [r.risk, r.choice, r.consequences, r.mitigation, r.acknowledgement, r.date]), true)}`, true),
    sourceEvidence ? section("Evidence Sources — Clinical Review", `<p>Labels identify where each supporting excerpt occurred, not whether its clinical meaning has been independently verified. An excerpt found in both sections is labelled with both sources. Unknown information remains unknown.</p>${clinicalTable(["Care-plan field / goal", "Source", "Exact supporting excerpt"], sourceEvidence.map(entry => {
      const goal = /^goals\.(\d+)\.evidence$/.exec(entry.path);
      const label = goal ? `Goal ${Number(goal[1]) + 1}` : entry.path;
      return [label, entry.kinds.map(kind => assessmentSourceLabels[kind]).join("; "), entry.quote];
    }))}`, true) : "",
    `<footer class="care-footer"><strong>CONFIDENTIAL</strong><span>${[doc.metadata.organisationName, doc.metadata.supportPhone, doc.metadata.supportEmail].filter(present).map(escapeText).join(" · ")}</span></footer>`,
  ].join("");
  return `<article class="care-template" data-care-document="${encodeURIComponent(JSON.stringify(doc))}">${body}</article>`;
}

export const carePlanCss = `
@page { size: A4; margin: 16mm 14mm 24mm; @bottom-left { content:"CONFIDENTIAL"; font:8pt Arial; } @bottom-right { content: "Page " counter(page) " of " counter(pages); font: 8pt Arial; } }
.care-template { color:#25282b; background:white; font:10.5pt/1.45 Arial,sans-serif; overflow-wrap:anywhere; }
.care-template * { box-sizing:border-box; }
.care-template h1 { color:#e88c42; text-align:center; font-size:25pt; border-top:3px solid #ed914d; padding-top:8pt; margin:14pt 0 8pt; }
.care-template h2 { font-size:15pt; color:#303538; text-align:center; border-top:2px solid #ed914d; border-bottom:1px solid #303538; padding:8pt 0; margin:18pt 0 8pt; break-after:avoid; }
.care-template h3 { font-size:11pt; margin:12pt 0 5pt; break-after:avoid; }
.care-template p { margin:4pt 0 7pt; white-space:pre-wrap; }
.care-template table { width:100%; border:0; border-collapse:collapse; table-layout:fixed; margin:6pt 0 12pt; }
.care-template td,.care-template th { padding:7pt 5pt; vertical-align:top; text-align:left; font-size:10pt; overflow-wrap:anywhere; }
.care-template .field-grid td { width:50%; border-left:0; border-right:0; border-top:1.5px solid #efb85e; border-bottom:1.5px solid #efb85e; }
.care-template .clinical-table td,.care-template .clinical-table th { border:1px solid #666; }
.care-template .clinical-table th { background:#f4eee8; font-size:9pt; }
.care-template thead { display:table-header-group; }
.care-template tr { break-inside:avoid; }
.care-template .goal { border-top:3px solid #303538; margin-top:18pt; }
.care-template .draft-status,.care-template .completion-note { color:#674325; font-size:9pt; }
.care-template .signature td { height:60pt; }
.care-template .care-footer { display:flex; justify-content:space-between; gap:15pt; border-top:2px solid #ed914d; margin-top:20pt; padding-top:8pt; font-size:8pt; }
@media print {
  .care-template { width:auto; }
  .care-template .care-footer { display:none; }
  .care-template h1,.care-template h2,.care-template th { print-color-adjust:exact; -webkit-print-color-adjust:exact; }
}
`;

/** Hex escapes prevent provider text from terminating either the CSS string or style tag. */
export function carePlanFooterCss(doc: CarePlanDocument | null): string {
  const support = doc ? [doc.metadata.organisationName, doc.metadata.supportPhone, doc.metadata.supportEmail].filter(present).join(" · ") : "";
  const content = Array.from(`CONFIDENTIAL${support ? `\n${support}` : ""}`)
    .map(char => `\\${char.codePointAt(0)!.toString(16)} `).join("");
  const identity = doc ? Array.from(`Full Name: ${doc.clientName}`).map(char => `\\${char.codePointAt(0)!.toString(16)} `).join("") : "";
  return `@page {
    @top-left { content:"${identity}"; font:8pt Arial; max-width:150mm; overflow:hidden; white-space:nowrap; }
    @top-right { content:"${doc ? "DRAFT" : ""}"; font:8pt Arial; }
    @bottom-left { content:"${content}"; white-space:pre-wrap; font:8pt Arial; color:#303538; }
  }`;
}
