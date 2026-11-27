import type { ClinicalContent } from "../../shared/care-plan-document";
import { transcriptEvidencePassages } from "./evidenceRepair";

export type SourcePassage = { id: string; text: string };
export function draftingPassages(source: string, part: number): SourcePassage[] {
  return transcriptEvidencePassages(source).map(passage => ({ ...passage, id: `part-${part}-${passage.id}` }));
}

// Wire evidence arrays contain IDs only. Persisted clinical documents continue
// to contain original excerpts, never model-written quotes or internal IDs.
export function resolveSourceSelections(content: ClinicalContent, passages: SourcePassage[]): ClinicalContent {
  const byId = new Map(passages.map(passage => [passage.id, passage.text]));
  const resolve = (ids: string[]) => ids.map(id => byId.get(id) ?? "");
  const result = structuredClone(content);
  for (const [path, ids] of Object.entries(result.evidence)) result.evidence[path] = resolve(ids);
  for (const goal of result.goals) goal.evidence = resolve(goal.evidence);
  // Unknown IDs deliberately become invalid empty quotes, never fuzzy matches.
  // Existing validation rejects them and permits only the bounded citation repair.
  return result;
}
