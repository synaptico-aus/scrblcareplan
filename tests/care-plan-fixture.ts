import { createCarePlanDocument, clinicalContentSchema, renderCarePlanDocument } from "../shared/care-plan-document";

/** Synthetic evidence, deliberately unrelated to any real saved client or reference sample. */
export function representativeCarePlan(goalCount = 21) {
  const content = clinicalContentSchema.parse({
    alerts: ["Documented penicillin allergy. Confirm clinical details before use."],
    profile: { fullName: "Alex Example", preferredName: "Alex", languages: "English", address: "Synthetic address for layout testing only", communication: "I prefer written information", decisionMaker: "I make my own decisions" },
    funding: { classification: "Participant-reported classification" },
    history: { family: "I live near my family and enjoy spending time with them.", interests: "I enjoy music, gardening and swimming." },
    medical: { history: "I described joint pain.", allergies: "Penicillin (participant-reported)" },
    medication: { managed: "I manage my own medicines." }, mobility: { access: "I prefer to walk short distances with someone I know.", equipment: "Walking frame" },
    providers: Array.from({ length: 9 }, (_, i) => ({ name: `Synthetic Provider ${i + 1}`, role: "Therapy provider", whenToContact: "As discussed with the care planner" })),
    supporters: [{ name: "Synthetic Supporter", relationship: "Friend", phone: "Synthetic number withheld", contactPermission: null, disclosurePermission: null }],
    careTeam: [{ name: "Synthetic Care Partner", role: "Care Partner" }],
    emergency: { nonResponse: "Use the instructions recorded by my care planner; this synthetic fixture is not a clinical instruction." },
    comfort: [{ concern: "Joint discomfort", actions: "Supported instructions for this synthetic layout", responsible: "Care planner", review: "At my scheduled review" }],
    goals: Array.from({ length: goalCount }, (_, i) => ({
      key: `goal-${i + 1}`, title: `I want to complete distinct activity ${i + 1}.`,
      abilities: "I explained what matters to me and the support I currently use.",
      tasks: `Activity ${i + 1} supported details. ` + "I prefer familiar people and clear written instructions. ".repeat(i === 3 ? 120 : 3),
      timing: "As discussed in the assessment", evidence: ["Synthetic layout evidence"],
    })),
    prepared: { name: "Synthetic Care Planner", role: "Care Partner" },
    summary: ["I explained my choices.", "I discussed my priorities.", "I discussed joint discomfort.", "I described daily supports.", null, null],
    riskNarrative: "I discussed concerns about walking outside. Specific choices, agreements and dates remain blank for completion.",
    risks: [{ risk: "Participant-reported concern about walking outside" }],
  });
  const doc = createCarePlanDocument("Alex Example", "ai", content);
  // Test-only organisation-scoped support configuration, never used by generation.
  doc.metadata.organisationName = "Synthetic Provider";
  doc.metadata.supportEmail = "support@example.invalid";
  doc.metadata.sourceEvidence = [
    { path: "goals.0.evidence", quote: "The notes describe an interest in swimming.", kinds: ["ai_notes"] },
    { path: "goals.0.evidence", quote: "I would like to swim.", kinds: ["transcript"] },
  ];
  return { doc, html: renderCarePlanDocument(doc) };
}
