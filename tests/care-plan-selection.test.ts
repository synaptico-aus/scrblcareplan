import { test } from "node:test";
import assert from "node:assert/strict";
import type OpenAI from "openai";
import { generateStructuredCarePlan } from "../server/services/structuredCarePlan";
import { readCarePlanDocument } from "../shared/care-plan-document";
import { storage } from "../server/storage";

test("real wire contract selects IDs in draft and audit, then renders original evidence", async () => {
  const original = storage.getServiceRates;
  storage.getServiceRates = async () => [];
  let calls = 0;
  const client = { chat: { completions: { create: async (request: any) => {
    calls++;
    const payload = JSON.parse(request.messages[1].content);
    assert.equal(payload.transcriptPart, undefined);
    assert.deepEqual(payload.sourcePassages, [
      { id: "part-1-source-1", text: "I want to swim — with assistance." },
      { id: "part-1-source-2", text: "Mondays suit me." },
    ]);
    assert.match(request.messages[0].content, /Never write quotes in evidence/);
    assert.match(request.messages[0].content, /Write all non-goal narrative content in the client's first person/);
    assert.match(request.messages[0].content, /goal narratives may use third person or "my provider"/);
    assert.match(request.messages[0].content, /Do not introduce ordinary care narratives with "The notes report"/);
    const reply = calls === 1
      ? { goals: [{ key: "swim", title: "Swim with assistance", evidence: ["part-1-source-1"] }],
          mobility: { access: "With assistance" }, evidence: { "mobility.access": ["part-1-source-1"] } }
      : { goals: [{ key: "swim", timing: "Mondays", evidence: ["part-1-source-2"] }] };
    return { choices: [{ finish_reason: "stop", message: { content: JSON.stringify(reply) } }] };
  } } } } as unknown as OpenAI;
  try {
    const html = await generateStructuredCarePlan(client, "gpt-6.2-sol",
      "I want to swim — with assistance. Mondays suit me.", "Synthetic participant", "test-org");
    const doc = readCarePlanDocument(html)!;
    assert.equal(calls, 2, "No new paid stages are introduced");
    assert.equal(doc.content.goals[0].timing, "Mondays");
    assert.deepEqual(doc.content.goals[0].evidence, ["I want to swim — with assistance.", "Mondays suit me."]);
    assert.deepEqual(doc.content.evidence["mobility.access"], ["I want to swim — with assistance."]);
    assert.ok(!JSON.stringify(doc).includes("source-1"), "IDs never reach saved/exported documents");
    assert.match(html, /My Care Plan/);
  } finally { storage.getServiceRates = original; }
});

test("invented IDs, raw quote responses and absent selections cannot bypass verification", async () => {
  const original = storage.getServiceRates;
  storage.getServiceRates = async () => [];
  try {
    for (const evidence of [["source-999"], ["part-2-source-1"], ["I want to swim."], []]) {
      let calls = 0;
      const client = { chat: { completions: { create: async (request: any) => {
        calls++;
        const payload = JSON.parse(request.messages[1].content);
        const reply = payload.targets
          ? { repairs: [{ path: "goals.0.evidence", sourceIds: [] }] }
          : { goals: [{ key: "swim", title: "Swim", evidence }] };
        return { choices: [{ finish_reason: "stop", message: { content: JSON.stringify(reply) } }] };
      } } } } as unknown as OpenAI;
      await assert.rejects(generateStructuredCarePlan(client, "gpt-6.2-sol", "I want to swim.", "Synthetic participant", "test-org"),
        /No partial care plan was saved/);
      assert.equal(calls, 2, "Only one correction is allowed");
    }
  } finally { storage.getServiceRates = original; }
});
