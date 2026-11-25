import { test } from "node:test";
import assert from "node:assert/strict";
import type OpenAI from "openai";
import { clinicalContentSchema, readCarePlanDocument } from "../shared/care-plan-document";
import { generateStructuredCarePlan, validateClinicalEvidence } from "../server/services/structuredCarePlan";
import { transcriptQuoteMatcher } from "../server/services/transcriptEvidence";
import { storage } from "../server/storage";

function queuedClient(replies: unknown[]) {
  const calls: any[] = [];
  const client = { chat: { completions: { create: async (request: any) => {
    calls.push(request);
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

test("one automatic correction recovers a bad quote without dropping valid goals", async () => withoutRates(async () => {
  const source = "I want to swim. I want to visit my sister.";
  const { client, calls } = queuedClient([
    { goals: [
      { key: "swim", title: "I want to swim", evidence: ["I want to swim."] },
      { key: "family", title: "I want to visit my sister", evidence: ["I would like to see my sister."] },
    ] },
    { goals: [
      { key: "swim", title: "I want to swim", evidence: ["I want to swim."] },
      { key: "family", title: "I want to visit my sister", evidence: ["I want to visit my sister."] },
    ] },
    { goals: [] },
  ]);
  const html = await generateStructuredCarePlan(client, "gpt-6.2-sol", source, "Synthetic Client", "test-org");
  assert.deepEqual(readCarePlanDocument(html)!.content.goals.map(g => g.key), ["swim", "family"]);
  assert.equal(calls.length, 3);
  const correction = JSON.parse(calls[1].messages.at(-1).content);
  assert.deepEqual(correction.previouslyVerifiedGoalKeys, ["swim"]);
  assert.equal(correction.validationIssues[0].reason, "quote_not_found");
  assert.ok(calls.every(call => call.model === "gpt-6.2-sol"));
}));

test("goal-check correction recovers missing update evidence rather than inheriting old evidence", async () => withoutRates(async () => {
  const { client, calls } = queuedClient([
    { goals: [{ key: "swim", title: "I want to swim", evidence: ["I want to swim."] }] },
    { goals: [{ key: "swim", timing: "Mondays" }] },
    { goals: [{ key: "swim", timing: "Mondays", evidence: ["Mondays would suit me."] }] },
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
    { goals: [{ key: "swim", tasks: "Unsupported invented task", evidence: ["Invented supporting quote"] }] },
  ]);
  await assert.rejects(generateStructuredCarePlan(client, "gpt-6.2-sol", "I want to swim.", "Synthetic Client", "test-org"), /after an automatic correction/);
  assert.equal(calls.length, 3, "Retries must be bounded");
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
