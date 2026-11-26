import { test } from "node:test";
import assert from "node:assert/strict";
import type OpenAI from "openai";
import { clinicalContentSchema, readCarePlanDocument } from "../shared/care-plan-document";
import { generateStructuredCarePlan, validateClinicalEvidence } from "../server/services/structuredCarePlan";
import { transcriptQuoteMatcher } from "../server/services/transcriptEvidence";
import { repairTranscriptEvidence, transcriptEvidencePassages } from "../server/services/evidenceRepair";
import { storage } from "../server/storage";

function queuedClient(replies: unknown[]) {
  const calls: any[] = [];
  const client = { chat: { completions: { create: async (request: any) => {
    calls.push(request);
    if (request.response_format?.type === "json_object") {
      assert.match(request.messages.map((message: any) => message.content).join("\n"), /\bjson\b/i, "OpenAI JSON mode requires an explicit JSON instruction");
    }
    assert.ok(replies.length, "Unexpected additional model call");
    return { choices: [{ finish_reason: "stop", message: { content: JSON.stringify(replies.shift()) } }] };
  } } } } as unknown as OpenAI;
  return { client, calls };
}

async function withoutRates(run: () => Promise<void>) {
  const original = storage.getServiceRates;
  storage.getServiceRates = async () => [];
  try { await run(); } finally { storage.getServiceRates = original; }
}

test("formatting-equivalent evidence resolves to exact original source", () => {
  const source = "Client: I’d like to go\n   swimming\u00a0on Mondays — with my daughter.";
  const quote = "I'd like to go swimming on Mondays - with my daughter.";
  const match = transcriptQuoteMatcher(source);
  assert.equal(match(quote), source.slice("Client: ".length));
  const content = clinicalContentSchema.parse({
    goals: [{ key: "swim", title: "I want to swim", evidence: [quote] }],
    profile: { delivery: "I prefer my daughter's company" },
    evidence: { "profile.delivery": [quote] },
  });
  validateClinicalEvidence(content, source);
  assert.equal(content.goals[0].evidence[0], source.slice("Client: ".length));
  assert.equal(content.evidence["profile.delivery"][0], source.slice("Client: ".length));
});

test("formatting normalization cannot erase negations, numbers, units or omitted words", () => {
  const source = "I do not consent. I take 20 mg. I want swimming, not gardening.";
  const match = transcriptQuoteMatcher(source);
  for (const quote of ["I do consent.", "I take 2 mg.", "I take 20 ml.", "I want swimming gardening.", "I want...gardening."]) {
    assert.equal(match(quote), null, quote);
  }
  assert.equal(match(" \n\t "), null);
  const shortQuote = transcriptQuoteMatcher("Client: “No”");
  assert.equal(shortQuote('"No"'), "“No”");
});

test("goal-check updates reuse verified titles while validating new evidence", async () => withoutRates(async () => {
  const source = "I want to swim. I’d like the\n   heated pool on Mondays.";
  const { client, calls } = queuedClient([
    { goals: [{ key: "swim", title: "I want to swim", evidence: ["I want to swim."] }] },
    { goals: [{ key: "swim", tasks: "Use the heated pool", timing: "Mondays", evidence: ["I'd like the heated pool on Mondays."] }] },
  ]);
  const html = await generateStructuredCarePlan(client, "gpt-6.2-sol", source, "Synthetic Client", "test-org");
  const goals = readCarePlanDocument(html)!.content.goals;
  assert.equal(goals.length, 1);
  assert.equal(goals[0].title, "I want to swim");
  assert.equal(goals[0].tasks, "Use the heated pool");
  assert.equal(goals[0].timing, "Mondays");
  assert.deepEqual(goals[0].evidence, ["I want to swim.", "I’d like the\n   heated pool on Mondays."]);
  assert.equal(calls.length, 2, "Formatting-only differences must not require another paid call");
}));

test("source-ID correction recovers a bad quote without rewriting valid goals", async () => withoutRates(async () => {
  const source = "I want to swim. I want to visit my sister.";
  const { client, calls } = queuedClient([
    { goals: [
      { key: "swim", title: "I want to swim", evidence: ["I want to swim."] },
      { key: "family", title: "I want to visit my sister", evidence: ["I would like to see my sister."] },
    ] },
    { repairs: [{ path: "goals.1.evidence", sourceIds: ["source-2"] }] },
    { goals: [] },
  ]);
  const html = await generateStructuredCarePlan(client, "gpt-6.2-sol", source, "Synthetic Client", "test-org");
  assert.deepEqual(readCarePlanDocument(html)!.content.goals.map(g => g.key), ["swim", "family"]);
  assert.equal(calls.length, 3);
  const correction = JSON.parse(calls[1].messages.at(-1).content);
  assert.deepEqual(correction.targets.map((target: any) => target.path), ["goals.1.evidence"]);
  assert.equal(correction.passages[1].text, "I want to visit my sister.");
  assert.deepEqual(readCarePlanDocument(html)!.content.goals[1].evidence, ["I want to visit my sister."]);
  assert.ok(calls.every(call => call.model === "gpt-6.2-sol"));
}));

test("goal-check correction recovers missing update evidence rather than inheriting old evidence", async () => withoutRates(async () => {
  const { client, calls } = queuedClient([
    { goals: [{ key: "swim", title: "I want to swim", evidence: ["I want to swim."] }] },
    { goals: [{ key: "swim", timing: "Mondays" }] },
    { repairs: [{ path: "goals.0.evidence", sourceIds: ["source-2"] }] },
  ]);
  const html = await generateStructuredCarePlan(client, "gpt-6.2-sol", "I want to swim. Mondays would suit me.", "Synthetic Client", "test-org");
  const goal = readCarePlanDocument(html)!.content.goals[0];
  assert.equal(goal.timing, "Mondays");
  assert.ok(goal.evidence.includes("Mondays would suit me."));
  assert.equal(calls.length, 3);
}));

test("unsupported updates still fail after one correction and cannot inherit approval from a known goal", async () => withoutRates(async () => {
  const { client, calls } = queuedClient([
    { goals: [{ key: "swim", title: "I want to swim", evidence: ["I want to swim."] }] },
    { goals: [{ key: "swim", tasks: "Unsupported invented task" }] },
    { repairs: [{ path: "goals.0.evidence", sourceIds: [] }] },
  ]);
  await assert.rejects(generateStructuredCarePlan(client, "gpt-6.2-sol", "I want to swim.", "Synthetic Client", "test-org"), /after an automatic correction/);
  assert.equal(calls.length, 3, "Retries must be bounded");
}));

test("repair fixes risk and late-goal citations together, without changing other draft content", async () => withoutRates(async () => {
  const source = "I want to swim. I have fallen twice. I want to visit my sister. I want help with shopping.";
  const initial = {
    risks: [{ risk: "I have fallen twice" }],
    evidence: { "risks.0.risk": ["I fell two times."] },
    goals: [
      { key: "swim", title: "I want to swim", evidence: ["I want to swim."] },
      { key: "family", title: "I want to visit my sister", evidence: ["I would like to see my sister."] },
      { key: "shop", title: "I want help with shopping", evidence: ["I need shopping assistance."] },
    ],
  };
  const { client, calls } = queuedClient([
    initial,
    { repairs: [
      { path: "risks.0.risk", sourceIds: ["source-2"] },
      { path: "goals.1.evidence", sourceIds: ["source-3"] },
      { path: "goals.2.evidence", sourceIds: ["source-4"] },
    ] },
    { goals: [] },
  ]);
  const html = await generateStructuredCarePlan(client, "gpt-6.2-sol", source, "Synthetic Client", "test-org");
  const content = readCarePlanDocument(html)!.content;
  assert.equal(calls.length, 3, "One repair plus the independent goal audit");
  assert.equal(content.risks[0].risk, initial.risks[0].risk);
  assert.deepEqual(content.goals.map(goal => goal.title), initial.goals.map(goal => goal.title));
  assert.deepEqual(content.goals[0].evidence, ["I want to swim."]);
  assert.deepEqual(content.evidence["risks.0.risk"], ["I have fallen twice."]);
  assert.deepEqual(content.goals[2].evidence, ["I want help with shopping."]);
}));

test("source passages are exact current-part text, retaining qualifiers and clinical quantities", () => {
  const source = "Worker: Can I share this?\r\nClient: I do not consent.\nI take 20 mg — not 2 mg.  I’d like help.";
  const passages = transcriptEvidencePassages(source);
  assert.ok(passages.length >= 4);
  passages.forEach(passage => assert.ok(source.includes(passage.text)));
  assert.ok(passages.some(passage => passage.text.includes("I do not consent.")));
  assert.ok(passages.some(passage => passage.text.includes("20 mg — not 2 mg.")));
  assert.equal(new Set(passages.map(passage => passage.id)).size, passages.length);
});

test("citation-only repair preserves verified support and cannot change clinical values", async () => {
  const source = "I want to swim. Mondays would suit me.";
  const original = clinicalContentSchema.parse({
    goals: [{ key: "swim", title: "I want to swim", timing: "Mondays", evidence: ["I want to swim.", "On Monday please."] }],
  });
  const before = structuredClone(original);
  const { client } = queuedClient([{ repairs: [{ path: "goals.0.evidence", sourceIds: ["source-2"] }] }]);
  const repaired = await repairTranscriptEvidence(client, "gpt-6.2-sol", original, source, ["goals.0.evidence"]);
  assert.deepEqual(original, before, "Repair must not mutate the input draft");
  assert.deepEqual(repaired.goals[0], {
    ...before.goals[0], evidence: ["I want to swim.", "Mondays would suit me."],
  });
  validateClinicalEvidence(repaired, source);
});

test("repair rejects invented passages, partial patches and attempts to rewrite the draft", async () => {
  const original = clinicalContentSchema.parse({
    medical: { allergies: "Penicillin" },
    goals: [{ key: "swim", title: "I want to swim", evidence: ["Paraphrased quote"] }],
  });
  const valid = { path: "goals.0.evidence", sourceIds: ["source-1"] };
  const invalidReplies = [
    { repairs: [{ ...valid, sourceIds: ["source-999"] }] },
    { repairs: [{ ...valid, sourceIds: [] }] },
    { repairs: [] },
    { repairs: [valid, valid] },
    { repairs: [{ ...valid, path: "medical.allergies" }] },
    { repairs: [{ ...valid, quotes: ["Invented quote"] }] },
    { repairs: [valid], goals: [] },
    { repairs: [{ ...valid, path: "__proto__.polluted" }] },
  ];
  for (const reply of invalidReplies) {
    const { client } = queuedClient([reply]);
    await assert.rejects(repairTranscriptEvidence(client, "gpt-6.2-sol", original, "I want to swim.", ["goals.0.evidence"]));
  }
  const { client } = queuedClient([{ repairs: [valid] }]);
  await assert.rejects(repairTranscriptEvidence(client, "gpt-6.2-sol", original, "I want to swim.", ["goals.0.evidence", "medical.allergies"]));
});

test("a truncated evidence correction fails closed without a third attempt", async () => withoutRates(async () => {
  let calls = 0;
  const client = { chat: { completions: { create: async () => {
    calls++;
    return { choices: [{
      finish_reason: calls === 1 ? "stop" : "length",
      message: { content: JSON.stringify(calls === 1
        ? { goals: [{ key: "swim", title: "I want to swim", evidence: ["Paraphrased quote"] }] }
        : { repairs: [{ path: "goals.0.evidence", sourceIds: ["source-1"] }] }) },
    }] };
  } } } } as unknown as OpenAI;
  await assert.rejects(generateStructuredCarePlan(client, "gpt-6.2-sol", "I want to swim.", "Synthetic Client", "test-org"), /after an automatic correction/);
  assert.equal(calls, 2);
}));

test("a new goal without a title is not mistaken for a verified existing goal", async () => withoutRates(async () => {
  const { client, calls } = queuedClient([
    { goals: [{ key: "swim", title: "I want to swim", evidence: ["I want to swim."] }] },
    { goals: [{ key: "new-unsupported", evidence: ["I want to swim."] }] },
    { goals: [{ key: "new-unsupported", evidence: ["I want to swim."] }] },
  ]);
  await assert.rejects(generateStructuredCarePlan(client, "gpt-6.2-sol", "I want to swim.", "Synthetic Client", "test-org"), /after an automatic correction/);
  assert.equal(calls.length, 3);
}));

test("correction cannot silently drop a previously verified distinct goal", async () => withoutRates(async () => {
  const { client } = queuedClient([
    { goals: [
      { key: "swim", title: "I want to swim", evidence: ["I want to swim."] },
      { key: "family", title: "I want to visit family", evidence: ["Not a source quote"] },
    ] },
    { goals: [{ key: "family", title: "I want to visit family", evidence: ["I want to visit family."] }] },
  ]);
  await assert.rejects(generateStructuredCarePlan(client, "gpt-6.2-sol", "I want to swim. I want to visit family.", "Synthetic Client", "test-org"), /after an automatic correction/);
}));

test("later transcript parts can update a known goal without repeating its title", async () => withoutRates(async () => {
  const source = "I want to swim.\n" + "Administrative conversation.\n".repeat(1100) + "For swimming, Mondays would suit me.";
  const calls: any[] = [];
  const client = { chat: { completions: { create: async (request: any) => {
    calls.push(request);
    const payload = JSON.parse(request.messages[1].content);
    const isAudit = "extractedGoals" in payload;
    const goals = isAudit ? [] : payload.transcriptPart.includes("I want to swim.") ? [{
      key: "swim", title: "I want to swim", evidence: ["I want to swim."],
    }] : payload.transcriptPart.includes("Mondays would suit me.") ? [{
      key: "swim", timing: "Mondays", evidence: ["For swimming, Mondays would suit me."],
    }] : [];
    return { choices: [{ finish_reason: "stop", message: { content: JSON.stringify({ goals }) } }] };
  } } } } as unknown as OpenAI;
  const html = await generateStructuredCarePlan(client, "gpt-6.2-sol", source, "Synthetic Client", "test-org");
  const goals = readCarePlanDocument(html)!.content.goals;
  assert.equal(goals.length, 1);
  assert.equal(goals[0].title, "I want to swim");
  assert.equal(goals[0].timing, "Mondays");
  assert.ok(calls.length >= 4);
  assert.ok(calls.every(call => call.messages.length === 2), "Valid cross-part updates should not trigger repairs");
}));
