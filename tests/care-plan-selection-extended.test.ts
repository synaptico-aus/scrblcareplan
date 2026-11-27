import { test } from "node:test";
import assert from "node:assert/strict";
import type OpenAI from "openai";
import { documentChunks, generateStructuredCarePlan } from "../server/services/structuredCarePlan";
import { draftingPassages, resolveSourceSelections } from "../server/services/sourceSelections";
import { clinicalContentSchema, readCarePlanDocument, renderCarePlanDocument } from "../shared/care-plan-document";
import { storage } from "../server/storage";

// Exercise the production wire contract directly, without the legacy quote adapter.
async function withProvider(run: () => Promise<void>) {
  const original = storage.getServiceRates;
  storage.getServiceRates = async () => [];
  try {
    await run();
  } finally { storage.getServiceRates = original; }
}

function provider(reply: (payload: any, call: number) => unknown) {
  let calls = 0;
  const client = { chat: { completions: { create: async (request: any) => {
    const result = reply(JSON.parse(request.messages[1].content), ++calls);
    return { choices: [{ finish_reason: "stop", message: { content: JSON.stringify(result) } }] };
  } } } } as unknown as OpenAI;
  return { client, calls: () => calls };
}

test("passage resolution preserves negations and quantities without mutating provider data", () => {
  const text = "I do not consent to sharing.\r\nI need 2 hours, not 4.\nI prefer café visits — only with support.";
  const passages = draftingPassages(text, 3);
  assert.deepEqual(passages.map(p => p.text), [
    "I do not consent to sharing.", "I need 2 hours, not 4.", "I prefer café visits — only with support.",
  ]);
  const input = clinicalContentSchema.parse({
    goals: [{ key: "visits", title: "Supported visits", evidence: [passages[2].id] }],
    evidence: { "profile.languages": [passages[0].id, passages[1].id] },
  });
  const before = structuredClone(input);
  const resolved = resolveSourceSelections(input, passages);
  assert.deepEqual(input, before);
  assert.deepEqual(resolved.goals[0].evidence, [passages[2].text]);
  assert.deepEqual(resolved.evidence["profile.languages"], passages.slice(0, 2).map(p => p.text));
});

test("long assessment chunking loses no characters or final goal", () => {
  const source = `${"Discussion with qualifiers — not approval.\r\n".repeat(900)}I want help visiting the library.`;
  const chunks = documentChunks(source);
  assert.ok(chunks.length > 2);
  assert.equal(chunks.join(""), source);
  assert.ok(chunks.every(chunk => chunk.length <= 16000));
  assert.ok(chunks.at(-1)!.endsWith("I want help visiting the library."));
  const ids = chunks.flatMap((chunk, index) => draftingPassages(chunk, index + 1).map(p => p.id));
  assert.equal(new Set(ids).size, ids.length);
});

test("an invalid draft selection can be repaired once without changing clinical values", async () => withProvider(async () => {
  const fake = provider((payload, call) => {
    if (call === 1) return { goals: [{ key: "library", title: "Visit the library", evidence: ["invented"] }] };
    if (call === 2) {
      assert.equal(payload.targets[0].value.title, "Visit the library");
      return { repairs: [{ path: "goals.0.evidence", sourceIds: [payload.passages[0].id] }] };
    }
    return { goals: [] };
  });
  const html = await generateStructuredCarePlan(fake.client, "gpt-6.2-sol",
    "I want to visit the library.", "Synthetic participant", "test-org");
  const doc = readCarePlanDocument(html)!;
  assert.equal(fake.calls(), 3, "Draft, single repair and normal goal audit only");
  assert.equal(doc.content.goals[0].title, "Visit the library");
  assert.deepEqual(doc.content.goals[0].evidence, ["I want to visit the library."]);
}));

test("audit evidence failure rejects the whole draft rather than returning its valid first pass", async () => withProvider(async () => {
  const fake = provider((payload, call) => {
    if (call === 1) return { goals: [{ key: "library", title: "Visit library", evidence: [payload.sourcePassages[0].id] }] };
    if (call === 2) return { goals: [{ key: "library", timing: "Mondays", evidence: ["part-99-source-1"] }] };
    return { repairs: [{ path: "goals.0.evidence", sourceIds: [] }] };
  });
  const progress: number[] = [];
  await assert.rejects(generateStructuredCarePlan(fake.client, "gpt-6.2-sol",
    "I want to visit the library.", "Synthetic participant", "test-org", n => progress.push(n)),
  /No partial care plan was saved/);
  assert.equal(fake.calls(), 3);
  assert.ok(!progress.includes(100), "A rejected audit must never signal completion");
}));

test("mixed-source direct selections retain both accounts through a document round trip", async () => withProvider(async () => {
  const fake = provider(payload => {
    if ("extractedGoals" in payload) return { goals: [] };
    const passage = payload.sourcePassages.find((p: any) => !["AI Notes", "Transcript"].includes(p.text));
    const isNotes = passage.text.startsWith("Notes");
    return { goals: [{
      key: "library", ...(isNotes ? { title: "Notes describe library visits" } : { timing: "Participant prefers Tuesdays" }),
      evidence: [passage.id],
    }] };
  });
  const html = await generateStructuredCarePlan(fake.client, "gpt-6.2-sol",
    "AI Notes\nNotes describe library visits on Mondays.\nTranscript\nI prefer Tuesdays for library visits.",
    "Synthetic participant", "test-org");
  const doc = readCarePlanDocument(html)!;
  assert.equal(fake.calls(), 4);
  assert.equal(doc.content.goals.length, 1);
  assert.deepEqual(doc.metadata.sourceEvidence?.map(e => e.kinds), [["ai_notes"], ["transcript"]]);
  assert.equal(doc.content.goals[0].timing, "Participant prefers Tuesdays");
  assert.ok(!JSON.stringify(doc).includes("part-1-source-"));
  assert.deepEqual(readCarePlanDocument(renderCarePlanDocument(doc)), doc);
}));

test("malformed provider replies have a bounded retry and cannot finish a plan", async () => withProvider(async () => {
  for (const reply of [null, { goals: "not-an-array" }, { goals: [{ evidence: [123] }] }]) {
    const fake = provider(() => reply);
    await assert.rejects(generateStructuredCarePlan(fake.client, "gpt-6.2-sol",
      "I want to visit the library.", "Synthetic participant", "test-org"), /No partial care plan was saved/);
    assert.equal(fake.calls(), 2);
  }
}));
