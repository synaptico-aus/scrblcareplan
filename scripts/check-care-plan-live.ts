import { writeFile, mkdir } from "node:fs/promises";
import { generateCarePlanHtml } from "../server/services/openai";
import { storage } from "../server/storage";
import { readCarePlanDocument } from "../shared/care-plan-document";
import assert from "node:assert/strict";

// Explicitly invoked smoke check only; it makes paid calls on the unchanged model.
// No real clients, organisation records, configured rates or database writes are used.
const original = storage.getServiceRates;
storage.getServiceRates = async () => [];
try {
  const beginning = `Client: My name is Alex Example. I prefer written instructions.
Client: I want to attend my local choir on Thursdays. My friend can drive me there.
Care Partner: Are you consenting to share your plan with your friend?
Client: I have not decided about sharing it yet.
Client: I want to keep gardening. I would like assistance with heavy pots.`;
  const ending = `
Client: Going back to the choir, I also need a printed song sheet.
Client: Before we finish, I want to visit my sister once a month.`;
  // Optional long fixture exercises updates to an earlier goal after chunking.
  const middle = process.argv.includes("--long")
    ? "\nCare Partner: We are checking the transcript connection; no further clinical information in this line.".repeat(430)
    : "";
  const transcript = beginning + middle + ending;
  const html = await generateCarePlanHtml(transcript, "Alex Example", "synthetic-smoke-check", (progress, stage) => console.log(`${Math.round(progress)}% ${stage}`), { fundingType: "sah", fundingLevel: "level3" });
  const doc = readCarePlanDocument(html)!;
  assert.equal(doc.content.goals.length, 3, "Expected choir, gardening and late family-visit goals");
  assert.equal(doc.content.risks.length, 0);
  assert.equal(doc.content.consent.declaration === "Yes", false);
  assert.equal(doc.metadata.reviewCycle, "Quarterly (every 3 months)");
  assert.ok(doc.content.goals.find(goal => goal.key === doc.content.goals[0].key)?.tasks?.toLowerCase().includes("song sheet"), "Late choir detail was not preserved");
  await mkdir("generated-artifacts", { recursive: true });
  await writeFile("generated-artifacts/live-smoke.html", html);
  console.log(`Live synthetic smoke check passed (${transcript.length} characters): three goals including the late goal; late task retained; quarterly review; no invented risks or positive consent.`);
} finally { storage.getServiceRates = original; }
