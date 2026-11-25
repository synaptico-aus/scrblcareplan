import type { ExtractedFacts } from "@shared/schema";
import { createCarePlanDocument, goalSchema, renderCarePlanDocument } from "../../shared/care-plan-document";
import { selectedFundingLabel, type FundingSelection } from "./structuredCarePlan";
import { fieldGroups } from "../../shared/care-plan-document";
import { getCarePlanTemplateConfiguration } from "./carePlanTemplateConfig";

// Offline extraction is deliberately literal: keywords alone cannot establish a finding.
export function generateOfflineFactsExtraction(transcript: string, clientName: string): ExtractedFacts {
  const explicit = (pattern: RegExp) => transcript.match(pattern)?.[0]?.replace(/^\s+/, "");
  return {
    clientDetails: { name: clientName },
    medical: {
      equipment: Array.from(transcript.matchAll(/\bI use (?:a |an |my )?(?:wheelchair|walker|walking frame|shower chair|personal alarm|grab rails)\b[^.!?\n]*/gi)).map(m => m[0]),
      allergies: explicit(/\bI am allergic to [^.!?\n]+/i),
      medications: explicit(/\bMy (?:medications?|medicines?) (?:are|is|include) [^.!?\n]+/i),
    },
    support: { livingArrangement: explicit(/\bI live (?:alone|with [^.!?\n]+)/i) },
    risks: [], preferences: {},
  };
}

export function generateOfflineCarePlan(transcript: string, clientName: string, funding: FundingSelection = {}, organisationId?: string): string {
  const doc = createCarePlanDocument(clientName, "offline", {}, selectedFundingLabel(funding));
  (doc.content as any).profile.fullName = clientName;
  const facts = generateOfflineFactsExtraction(transcript, clientName);
  if (facts.medical.allergies) {
    doc.content.medical.allergies = facts.medical.allergies;
    doc.content.evidence["medical.allergies"] = [facts.medical.allergies];
  }
  if (facts.medical.medications) {
    doc.content.medication.medications = facts.medical.medications;
    doc.content.evidence["medication.medications"] = [facts.medical.medications];
  }
  if (facts.medical.equipment?.length) {
    doc.content.mobility.equipment = facts.medical.equipment.join("\n");
    doc.content.evidence["mobility.equipment"] = facts.medical.equipment;
  }
  // Explicit labelled answers can be retained without guessing clinical meaning.
  for (const line of transcript.split("\n")) {
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const label = line.slice(0, separator).trim().toLowerCase();
    const answer = line.slice(separator + 1).trim();
    if (!answer || /^(?:unknown|not (?:known|documented|provided)|n\/a|unsure)$/i.test(answer)) continue;
    for (const [group, labels] of Object.entries(fieldGroups)) {
      for (const [key, fieldLabel] of Object.entries(labels)) {
        if (label !== fieldLabel.toLowerCase() || (group === "profile" && key === "fullName")) continue;
        // Offline cannot verify document supply, consent or authorisation from a label alone.
        if (["consent", "prepared"].includes(group) || /attachment|authorisation|attorneyPaperwork/.test(key)) continue;
        (doc.content as any)[group][key] = answer;
        doc.content.evidence[`${group}.${key}`] = [line];
      }
    }
  }
  const goals = new Map<string, ReturnType<typeof goalSchema.parse>>();
  // Preserve explicitly stated goals verbatim, including late goals. No generic default.
  for (const line of transcript.split(/\n|(?<=[.!?])\s+(?=[A-Z])/)) {
    const spoken = line.replace(/^\s*(?:Client|Participant|Patient|[^:]{1,40}):\s*/i, "").trim();
    const discussion = spoken.replace(/^(?:Also[, ]+|Before we finish[, ]+)/i, "");
    if (/^(?:Regarding|Returning to|Going back to|About)\b/i.test(discussion)) {
      const matches = Array.from(goals.values()).filter(goal =>
        (goal.title || "").toLowerCase().split(/\W+/).filter(word => word.length > 4 && !["would", "activity", "assistance", "support"].includes(word))
          .some(word => discussion.toLowerCase().split(/\W+/).includes(word)));
      if (matches.length === 1) {
        matches[0].tasks = [matches[0].tasks, spoken].filter(Boolean).join("\n");
        matches[0].evidence.push(spoken);
      }
      continue;
    }
    if (!/^(?:I (?:want|would like|need|aim|hope|plan)\b|My goal is\b|Goal\s*\d*\s*:)/i.test(discussion)) continue;
    if (/^I (?:want|would like|need) to (?:thank|ask|mention|say|know|hang up|finish|end the call)\b/i.test(discussion)) continue;
    const title = discussion.replace(/^Goal\s*\d*\s*:\s*/i, "");
    const key = title.toLowerCase().replace(/[^\w]+/g, " ").trim();
    if (!goals.has(key)) goals.set(key, goalSchema.parse({ key, title, evidence: [spoken] }));
  }
  doc.content.goals = Array.from(goals.values());
  if (organisationId) Object.assign(doc.metadata, getCarePlanTemplateConfiguration(organisationId));
  return renderCarePlanDocument(doc);
}
