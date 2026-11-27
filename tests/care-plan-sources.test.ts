import { test } from "node:test";
import assert from "node:assert/strict";
import type OpenAI from "openai";
import { assessmentSources } from "../shared/assessment-sources";
import { createCarePlanDocument, readCarePlanDocument, renderCarePlanDocument } from "../shared/care-plan-document";
import { generateStructuredCarePlan } from "./source-selection-fixture";
import { storage } from "../server/storage";

test("explicit mixed-source detection preserves all text and is conservative", () => {
  const text = "Assessment\r\nAI Notes\r\nSummary text.\r\nTranscript\r\nSpeaker 1: Original speech.";
  const parts = assessmentSources(text);
  assert.deepEqual(parts.map(part => part.kind), ["unclassified", "ai_notes", "transcript"]);
  assert.equal(parts.map(part => part.text).join(""), text);
  for (const input of ["Just speech.", "AI Notes\nSummary only.", "Transcript\nSpeech.", "AI Notes mentioned within a sentence. Transcript follows."]) {
    assert.deepEqual(assessmentSources(input), [{ kind: "unclassified", text: input }]);
  }
});

test("old documents remain compatible and source excerpts are escaped in exports", () => {
  const old = createCarePlanDocument("Synthetic participant", "ai");
  assert.equal(old.metadata.sourceEvidence, undefined);
  assert.ok(!renderCarePlanDocument(old).includes("Evidence Sources"));
  old.metadata.sourceEvidence = [{
    path: "goals.0.evidence", quote: "<script>alert('unsafe')</script>", kinds: ["ai_notes", "transcript"],
  }];
  const html = renderCarePlanDocument(old);
  assert.ok(!html.includes("<script>"));
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /secondary source; Original transcript/);
  assert.deepEqual(readCarePlanDocument(html), old);
});

test("mixed-source drafting, audit and repair carry labels through merging and saved rendering", async () => {
  const originalRates = storage.getServiceRates;
  storage.getServiceRates = async () => [];
  const requests: any[] = [];
  const source = "AI Notes\nThe notes describe a wish to swim.\nTranscript\nI want to swim on Mondays.";
  const client = { chat: { completions: { create: async (request: any) => {
    requests.push(request);
    const payload = JSON.parse(request.messages[1].content);
    const instructions = request.messages[0].content;
    assert.match(instructions, /Write supported non-goal care narratives in first person regardless of source type/);
    assert.match(instructions, /Goals may use third person or "my provider"/);
    assert.match(instructions, /If accounts conflict, explicitly distinguish the conflicting accounts for clinical review/);
    assert.match(instructions, /Never write or rewrite excerpts in evidence arrays/);
    if (!payload.targets) {
      assert.match(instructions, /Write all non-goal narrative content in the client's first person/);
      assert.match(instructions, /Factual labels, names and contact details need not be rewritten/);
      assert.match(instructions, /Goals are the exception/);
    }
    let reply: unknown;
    if (payload.targets) {
      assert.match(request.messages[0].content, /Original transcript — recorded speech/);
      assert.equal(payload.targets[0].value.evidence, undefined, "Bad citations are not clinical assertions to re-prove");
      const passage = payload.passages.find((p: any) => p.text.includes("I want to swim on Mondays."));
      reply = { repairs: [{ path: "goals.0.evidence", sourceIds: [passage.id] }] };
    } else if ("extractedGoals" in payload) reply = { goals: [] };
    else if (payload.transcriptPart.startsWith("AI Notes")) {
      assert.match(request.messages[0].content, /AI-written assessment notes — secondary source/);
      assert.ok(!payload.transcriptPart.includes("Transcript"));
      reply = { goals: [{ key: "swim", title: "The notes describe swimming", evidence: ["The notes describe a wish to swim."] }] };
    } else {
      assert.match(request.messages[0].content, /Original transcript — recorded speech/);
      assert.ok(!payload.transcriptPart.includes("AI Notes"));
      reply = { goals: [{ key: "swim", timing: "Mondays", evidence: ["I would like swimming on Mondays."] }] };
    }
    return { choices: [{ finish_reason: "stop", message: { content: JSON.stringify(reply) } }] };
  } } } } as unknown as OpenAI;
  try {
    const html = await generateStructuredCarePlan(client, "gpt-6.2-sol", source, "Synthetic participant", "test-org");
    const doc = readCarePlanDocument(html)!;
    assert.equal(requests.length, 5, "Two labelled parts, two audits, one citation repair");
    assert.equal(doc.content.goals.length, 1);
    assert.equal(doc.content.goals[0].timing, "Mondays");
    assert.deepEqual(doc.metadata.sourceEvidence?.map(entry => entry.kinds), [["ai_notes"], ["transcript"]]);
    assert.ok(doc.metadata.sourceEvidence?.every(entry => entry.path === "goals.0.evidence"));
    assert.match(html, /AI-written assessment notes — secondary source/);
    assert.match(html, /Original transcript — recorded speech/);
    assert.match(html, /not verbatim participant statements/);
    assert.deepEqual(readCarePlanDocument(renderCarePlanDocument(doc)), doc);
  } finally { storage.getServiceRates = originalRates; }
});
