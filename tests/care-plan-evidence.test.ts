import { test } from "node:test";
import assert from "node:assert/strict";
import type OpenAI from "openai";
import { clinicalContentSchema, readCarePlanDocument } from "../shared/care-plan-document";
import { validateClinicalEvidence } from "../server/services/structuredCarePlan";
import { generateStructuredCarePlan } from "./source-selection-fixture";
import { transcriptQuoteMatcher } from "../server/services/transcriptEvidence";
import { repairTranscriptEvidence, transcriptEvidencePassages } from "../server/services/evidenceRepair";
import { storage } from "../server/storage";
import { EvidenceRepairError } from "../server/services/evidenceDiagnostics";

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
  assert.equal(goals[0].evidence.join(" ").replace(/\s+/g, " "), "I want to swim. I’d like the heated pool on Mondays.");
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
  const { client, calls } = queuedClient([{ repairs: [{ path: "goals.0.evidence", sourceIds: ["source-2"] }] }]);
  const repaired = await repairTranscriptEvidence(client, "gpt-6.2-sol", original, source, ["goals.0.evidence"]);
  assert.equal(JSON.parse(calls[0].messages[1].content).targets[0].value.title, before.goals[0].title,
    "A newly asserted title must remain in the evidence repair target");
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

test("repair of a cross-part delta does not demand fresh evidence for an inherited title", async () => withoutRates(async () => {
  const source = "I want to swim.\n" + "Administrative conversation.\n".repeat(1100) + "Mondays would suit me, with assistance.";
  const calls: any[] = [];
  const client = { chat: { completions: { create: async (request: any) => {
    calls.push(request);
    const payload = JSON.parse(request.messages[1].content);
    let reply: unknown;
    if (payload.targets) {
      assert.equal(payload.targets[0].value.title, null, "An inherited title is not a current-part assertion");
      assert.equal(payload.targets[0].value.timing, "Mondays, with assistance");
      assert.equal(payload.targets[0].value.evidence, undefined);
      const passage = payload.passages.find((p: any) => p.text === "Mondays would suit me, with assistance.");
      assert.ok(passage);
      assert.ok(!payload.passages.some((p: any) => p.text === "I want to swim."));
      reply = { repairs: [{ path: payload.targets[0].path, sourceIds: [passage.id] }] };
    } else if ("extractedGoals" in payload) reply = { goals: [] };
    else reply = { goals: payload.transcriptPart.includes("I want to swim.") ? [
      { key: "swim", title: "I want to swim", evidence: ["I want to swim."] },
    ] : payload.transcriptPart.includes("Mondays would suit me") ? [
      { key: "swim", timing: "Mondays, with assistance", evidence: ["Mondays suit me."] },
    ] : [] };
    return { choices: [{ finish_reason: "stop", message: { content: JSON.stringify(reply) } }] };
  } } } } as unknown as OpenAI;
  const html = await generateStructuredCarePlan(client, "gpt-6.2-sol", source, "Synthetic Client", "test-org");
  const goals = readCarePlanDocument(html)!.content.goals;
  assert.equal(goals.length, 1);
  assert.equal(goals[0].title, "I want to swim");
  assert.equal(goals[0].timing, "Mondays, with assistance");
  assert.ok(goals[0].evidence.includes("Mondays would suit me, with assistance."));
  assert.equal(calls.filter(call => JSON.parse(call.messages[1].content).targets).length, 1);
}));

test("repair rejections expose fixed safe categories, never model text", async () => {
  const original = clinicalContentSchema.parse({
    goals: [{ key: "swim", title: "I want to swim", evidence: ["Bad citation"] }],
    medical: { allergies: "Unknown" },
  });
  const valid = { path: "goals.0.evidence", sourceIds: ["source-1"] };
  const cases: [unknown, string][] = [
    [{ repairs: [{ ...valid, sourceIds: [] }] }, "unsupported_content"],
    [{ repairs: [{ ...valid, sourceIds: ["secret-source-text"] }] }, "unknown_source_id"],
    [{ repairs: [valid, valid] }, "unexpected_or_duplicate_path"],
    [{ repairs: [{ ...valid, path: "secret-clinical-value" }] }, "unexpected_or_duplicate_path"],
    [{ repairs: [valid], goals: ["secret-clinical-value"] }, "invalid_structure"],
    [{ repairs: [] }, "invalid_structure"],
  ];
  for (const [reply, category] of cases) {
    const { client } = queuedClient([reply]);
    await assert.rejects(
      repairTranscriptEvidence(client, "gpt-6.2-sol", original, "I want to swim.", [valid.path]),
      error => error instanceof EvidenceRepairError && error.category === category && !error.message.includes("secret"),
    );
  }
  const { client } = queuedClient([{ repairs: [valid] }]);
  await assert.rejects(
    repairTranscriptEvidence(client, "gpt-6.2-sol", original, "I want to swim.", [valid.path, "medical.allergies"]),
    error => error instanceof EvidenceRepairError && error.category === "missing_repair",
  );
  for (const category of ["invalid_json", "incomplete_response", "provider_request_failed"] as const) {
    let count = 0;
    const client = { chat: { completions: { create: async () => {
      count++;
      if (category === "provider_request_failed") throw new Error("secret provider reply");
      return { choices: [{
        finish_reason: category === "incomplete_response" ? "length" : "stop",
        message: { content: "secret invalid JSON" },
      }] };
    } } } } as unknown as OpenAI;
    await assert.rejects(
      repairTranscriptEvidence(client, "gpt-6.2-sol", original, "I want to swim.", [valid.path]),
      error => error instanceof EvidenceRepairError && error.category === category && !error.message.includes("secret"),
    );
    assert.equal(count, 1, "Diagnostics must not add provider retries");
  }
});

test("generation outcome logs correlate attempts and redact clinical content", async () => withoutRates(async () => {
  const events: any[][] = [];
  const originalInfo = console.info;
  console.info = (...args) => { events.push(args); };
  try {
    const success = queuedClient([{ goals: [] }, { goals: [] }]);
    await generateStructuredCarePlan(success.client, "gpt-6.2-sol", "Private transcript sentinel.", "Private name sentinel", "private-org");
    const failure = queuedClient([
      { goals: [{ key: "swim", title: "Swim", evidence: ["Incorrect quote"] }] },
      { repairs: [{ path: "goals.0.evidence", sourceIds: [] }] },
    ]);
    await assert.rejects(generateStructuredCarePlan(failure.client, "gpt-6.2-sol", "Private transcript sentinel.", "Private name sentinel", "private-org"));
    const starts = events.filter(([event]) => event === "Care-plan generation started");
    const completed = events.filter(([event]) => event === "Care-plan generation completed");
    const failed = events.filter(([event]) => event === "Care-plan generation failed");
    assert.equal(starts.length, 2);
    assert.equal(completed.length, 1);
    assert.equal(failed.length, 1);
    assert.equal(completed[0][1].generationId, starts[0][1].generationId);
    assert.equal(failed[0][1].generationId, starts[1][1].generationId);
    assert.notEqual(starts[0][1].generationId, starts[1][1].generationId);
    const rejected = events.find(([event]) => event === "Care-plan evidence correction rejected");
    assert.equal(rejected[1].category, "unsupported_content");
    assert.equal(rejected[1].generationId, failed[0][1].generationId);
    assert.doesNotMatch(JSON.stringify(events), /Private|private-org|Incorrect quote|Swim/);
  } finally { console.info = originalInfo; }
}));
