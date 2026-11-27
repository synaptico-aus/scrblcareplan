import { test } from "node:test";
import assert from "node:assert/strict";
import {
  carePlanDocumentSchema, clinicalContentSchema, createCarePlanDocument, goalSchema,
  readCarePlanDocument, renderCarePlanDocument, standards, carePlanCss, escapeText,
} from "../shared/care-plan-document";
import { documentChunks, mergeClinicalContent, validateClinicalEvidence, selectedFundingLabel } from "../server/services/structuredCarePlan";
import { generateStructuredCarePlan } from "./source-selection-fixture";
import { generateOfflineCarePlan, generateOfflineFactsExtraction } from "../server/services/carePlanGenerator";
import { storage } from "../server/storage";
import type OpenAI from "openai";

test("sparse documents retain required appendices, omit unknowns and never imply consent", () => {
  const doc = createCarePlanDocument("Alex & <script>alert(1)</script>", "offline");
  const html = renderCarePlanDocument(doc);
  assert.ok(html.includes("Transcript Summary – Alex &amp; &lt;script&gt;"));
  for (const label of standards) assert.ok(html.includes(escapeText(label)));
  assert.ok(html.indexOf("Care Plan Prepared By") < html.indexOf("Transcript Summary"));
  assert.ok(html.indexOf("Transcript Summary") < html.indexOf("Dignity of Risk Assessment"));
  for (const unsupported of ["No allergies", ">Yes<", ">Today<", "GOAL 1", "Not documented", "Salveo Concierge", "homecare@salveocare", "TEST_ONLY"]) assert.ok(!html.includes(unsupported), unsupported);
  assert.ok(html.includes("Quarterly (every 3 months)"));
  assert.ok(html.includes("Participant or Support Person"));
  assert.ok(html.includes("Acknowledgement</th><th>Date</th>"));
  assert.ok(!html.includes("<script>"));
  assert.deepEqual(readCarePlanDocument(html), doc);
});

test("strict schema rejects unknown versions, unknown fields, and malformed marked documents", () => {
  const doc = createCarePlanDocument("Alex", "ai");
  assert.throws(() => carePlanDocumentSchema.parse({ ...doc, version: 2 }));
  assert.throws(() => clinicalContentSchema.parse({ medical: { inventedField: "yes" } }));
  assert.throws(() => readCarePlanDocument('<article data-care-document="%xx">'));
  assert.equal(readCarePlanDocument("<h1>Historical care plan</h1>"), null);
});

test("complete document uses the reference order with dynamic contacts and more than 15 goals", () => {
  const content = clinicalContentSchema.parse({
    alerts: ["Documented allergy"], profile: { fullName: "Alex", languages: "Italian", interpreter: "No" },
    history: { family: "My family lives nearby" }, funding: { atTier: "Low" }, medical: { history: "I have arthritis" },
    medication: { managed: "I manage my medicines" }, mobility: { equipment: "I use a walker" },
    providers: Array.from({ length: 8 }, (_, i) => ({ name: `Provider ${i + 1}` })),
    supporters: [{ name: "Sam", disclosurePermission: null }], informalSupports: "My family",
    careTeam: [{ name: "Jo", role: "Nurse" }], emergency: { nonResponse: "Call my daughter" },
    comfort: [{ concern: "Pain", actions: "Documented instructions" }],
    goals: Array.from({ length: 23 }, (_, i) => ({ key: `goal-${i}`, title: `I want goal ${i + 1}`, tasks: "Documented task ".repeat(50), evidence: [`goal ${i + 1}`] })),
    consent: { declaration: "I have not yet decided" }, prepared: { name: "Care planner" },
    summary: ["Choice", "Planning", "Clinical", "Daily living", null, null],
    riskNarrative: "I discussed a risk", risks: [{ risk: "Falls", choice: "I choose my usual route" }],
  });
  const html = renderCarePlanDocument(createCarePlanDocument("Alex", "ai", content));
  const headings = ["Care Alerts", "My Care Plan", "Important things", "My Medical Information", "Medication Management", "Mobility and Equipment", "My Preferred Service Providers", "Informal Supports", "My Support Network", "My Care Team", "Additional Instructions", "Symptom Management", "My Goals", "Care Plan Consent", "Care Plan Prepared", "Transcript Summary", "Dignity of Risk Assessment"];
  let previous = -1;
  for (const heading of headings) {
    const index = html.indexOf(heading);
    assert.ok(index > previous, heading);
    previous = index;
  }
  assert.equal((html.match(/<h3>GOAL /g) || []).length, 23);
  assert.ok(html.includes("Provider 8"));
  assert.ok(!html.includes("Permission to share details"));
  assert.ok(html.includes('class="clinical-table"'));
});

test("configured costs only: unknown rates/hours are omitted, explicit hours use 4.33 weeks", () => {
  const doc = createCarePlanDocument("Alex", "ai", { goals: [
    { key: "clean", title: "I want a clean home", service: "Domestic assistance", hoursPerWeek: 2 },
    { key: "garden", title: "I want my garden maintained", service: "Gardening", hoursPerWeek: 1 },
  ] });
  doc.metadata.rates = [{ service: "Domestic assistance", hourlyRate: 85 }];
  const html = renderCarePlanDocument(doc);
  assert.ok(html.includes("$85.00/hour ($736.10/month)"));
  assert.equal((html.match(/How much will it cost/g) || []).length, 1);
  assert.ok(selectedFundingLabel({ fundingType: "hcp", fundingLevel: "level4" })?.includes("HCP Level 4"));
  assert.equal(selectedFundingLabel({ fundingType: "hcp", fundingLevel: "level8" }), null);
});

test("chunking preserves every original character and late goals without a summarization cap", () => {
  const source = ("Client: first details at 10:30 am\n".repeat(1800)) + "Client: I want to visit my sister.";
  assert.equal(documentChunks(source).join(""), source);
  assert.ok(documentChunks(source).at(-1)?.endsWith("sister."));
});

test("goal registry merges later tasks/timing into the first goal without merging distinct goals", () => {
  const first = clinicalContentSchema.parse({ goals: [
    { key: "swim", title: "I want to swim", tasks: "Arrange transport", evidence: ["I want to swim"] },
    { key: "shop", title: "I want to shop", evidence: ["I want to shop"] },
  ] });
  const later = clinicalContentSchema.parse({ goals: [
    { key: "swim", title: "I want to keep swimming", tasks: "Use the heated pool", timing: "Monday", evidence: ["Heated pool on Monday"] },
    { key: "family", title: "I want to visit family", evidence: ["I want to visit family"] },
  ] });
  const merged = mergeClinicalContent(first, later);
  assert.equal(merged.goals.length, 3);
  assert.equal(merged.goals[0].title, "I want to swim");
  assert.equal(merged.goals[0].tasks, "Arrange transport\nUse the heated pool");
  assert.equal(merged.goals[0].timing, "Monday");
  assert.equal(merged.goals[2].key, "family");
});

test("merged evidence follows appended clinical rows, not the old chunk's indices", () => {
  const a = clinicalContentSchema.parse({ supporters: [{ name: "Sam" }], evidence: { "supporters.0.name": ["Sam helps"] } });
  const b = clinicalContentSchema.parse({ supporters: [{ name: "Jo" }], evidence: { "supporters.0.name": ["Jo helps"] } });
  const merged = mergeClinicalContent(a, b);
  assert.deepEqual(merged.evidence["supporters.1.name"], ["Jo helps"]);
  assert.deepEqual(merged.evidence["supporters.0.name"], ["Sam helps"]);
});

test("evidence validation fails closed for invented findings, goal quotes and generated prices", () => {
  assert.throws(() => validateClinicalEvidence(clinicalContentSchema.parse({ medical: { allergies: "No allergies" } }), "Hello"));
  assert.throws(() => validateClinicalEvidence(clinicalContentSchema.parse({ goals: [{ key: "x", title: "I want to walk", evidence: ["invented"] }] }), "Hello"));
  assert.throws(() => validateClinicalEvidence(clinicalContentSchema.parse({ goals: [{ key: "x", title: "I want to walk for $95", evidence: ["walk"] }] }), "walk"));
  validateClinicalEvidence(clinicalContentSchema.parse({ medical: { allergies: "Penicillin" }, evidence: { "medical.allergies": ["I am allergic to penicillin"] } }), "I am allergic to penicillin");
});

test("offline output is conservative, safe, has zero/one/many goals and never creates false findings", () => {
  for (const count of [0, 1, 21]) {
    const transcript = "No falls. I do not use a wheelchair. My friend speaks Italian.\n" +
      Array.from({ length: count }, (_, i) => `Client: I want to complete activity ${i + 1}.`).join("\n");
    const html = generateOfflineCarePlan(transcript, "Alex <b>Smith</b>", { fundingType: "sah", fundingLevel: "level4" });
    assert.equal(readCarePlanDocument(html)?.content.goals.length, count);
    assert.ok(html.includes("SaH Level 4"));
    assert.ok(!html.includes("Falls risk identified"));
    assert.ok(!html.includes(">Yes<"));
    assert.deepEqual(generateOfflineFactsExtraction(transcript, "Alex").risks, []);
  }
  const html = generateOfflineCarePlan("Preferred Language/s: Greek\nClient: I want to <img src=x onerror=alert(1)> walk.", "Alex");
  assert.ok(html.includes("Greek"));
  assert.ok(!html.includes("<img"));
  const revisited = readCarePlanDocument(generateOfflineCarePlan(
    "Client: I want to attend choir.\nClient: I want to keep gardening.\nClient: Going back to choir, I also need a printed song sheet.\nClient: Before we finish, I want to visit my sister.", "Alex"))!;
  assert.equal(revisited.content.goals.length, 3);
  assert.ok(revisited.content.goals[0].tasks?.includes("printed song sheet"));
  assert.equal(generateOfflineFactsExtraction("I take the bus every day.", "Alex").medical.medications, undefined);
});

test("HTML saved record JSON round trip retains structured content/version and appendix blanks", () => {
  const html = generateOfflineCarePlan("Client: I want to swim.", "Alex");
  const record = JSON.parse(JSON.stringify({ clientName: "Alex", html, extractedFacts: generateOfflineFactsExtraction("", "Alex") }));
  const doc = readCarePlanDocument(record.html)!;
  assert.equal(doc.version, 1);
  assert.equal(doc.content.risks.length, 0);
  assert.equal(renderCarePlanDocument(doc), html);
});

test("AI processes all chunks through the existing model and fails on incomplete responses", async () => {
  const original = storage.getServiceRates;
  storage.getServiceRates = async () => [];
  try {
    const calls: any[] = [];
    const client = { chat: { completions: { create: async (request: any) => {
      calls.push(request);
      const part = JSON.parse(request.messages[1].content).transcriptPart;
      const goals = part.includes("I want to swim") ? [{ key: "swim", title: "I want to swim", evidence: ["I want to swim"] }] : [];
      if (part.includes("I want to visit family")) goals.push({ key: "family", title: "I want to visit family", evidence: ["I want to visit family"] });
      return { choices: [{ finish_reason: "stop", message: { content: JSON.stringify({ goals }) } }] };
    } } } } as unknown as OpenAI;
    const transcript = "I want to swim\n" + "Other discussion.\n".repeat(2200) + "I want to visit family";
    const html = await generateStructuredCarePlan(client, "gpt-6.2-sol", transcript, "Alex", "test-org", undefined, { fundingType: "sah", fundingLevel: "level3" });
    assert.equal(readCarePlanDocument(html)?.content.goals.length, 2);
    assert.ok(calls.length > 1);
    assert.ok(calls.every(call => call.model === "gpt-6.2-sol"));
    assert.equal(JSON.parse(calls.at(-1).messages[1].content).priorGoals[0].key, "swim");
    assert.ok(html.includes("SaH Level 3"));
    const truncated = { chat: { completions: { create: async () => ({ choices: [{ finish_reason: "length", message: { content: "{}" } }] }) } } } as unknown as OpenAI;
    await assert.rejects(generateStructuredCarePlan(truncated, "gpt-6.2-sol", "text", "Alex", "test-org"), /incomplete/);
  } finally { storage.getServiceRates = original; }
});

test("independent goal audit recovers an omitted earlier goal and preserves first-mentioned order", async () => {
  const original = storage.getServiceRates;
  storage.getServiceRates = async () => [];
  try {
    let call = 0;
    const client = { chat: { completions: { create: async () => ({
      choices: [{ finish_reason: "stop", message: { content: JSON.stringify({
        goals: ++call === 1
          ? [{ key: "family", title: "I want to visit family", evidence: ["I want to visit family"] }]
          : [{ key: "swim", title: "I want to swim", evidence: ["I want to swim"] }],
      }) } }],
    }) } } } as unknown as OpenAI;
    const html = await generateStructuredCarePlan(client, "gpt-6.2-sol", "I want to swim. Later I want to visit family.", "Alex", "test-org");
    assert.deepEqual(readCarePlanDocument(html)?.content.goals.map(g => g.key), ["swim", "family"]);
    assert.equal(call, 2);
  } finally { storage.getServiceRates = original; }
});

test("print styling is A4 with repeating table headings, safe margins and page counters", () => {
  assert.match(carePlanCss, /size: A4/);
  assert.match(carePlanCss, /counter\(page\)/);
  assert.match(carePlanCss, /table-header-group/);
  assert.match(carePlanCss, /break-inside:avoid/);
});
