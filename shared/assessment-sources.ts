export type AssessmentSourceKind = "ai_notes" | "transcript" | "unclassified";
export type AssessmentSource = { kind: AssessmentSourceKind; text: string };
export const assessmentSourceLabels: Record<AssessmentSourceKind, string> = {
  ai_notes: "AI-written assessment notes — secondary source",
  transcript: "Original transcript — recorded speech",
  unclassified: "Supplied assessment text — source type unconfirmed",
};

// Conservative, explicit headings only. Preserve every character, including
// document preambles, and never guess that an unlabelled document is speech.
export function assessmentSources(text: string): AssessmentSource[] {
  const headings = Array.from(text.matchAll(/^[ \t]*(AI Notes|Transcript)[ \t]*\r?$/gim));
  const notes = headings.find(h => h[1].toLowerCase() === "ai notes");
  const speech = notes && headings.find(h => h.index! > notes.index! && h[1].toLowerCase() === "transcript");
  if (!notes || !speech) return [{ kind: "unclassified", text }];
  return [
    ...(notes.index! > 0 ? [{ kind: "unclassified" as const, text: text.slice(0, notes.index) }] : []),
    { kind: "ai_notes", text: text.slice(notes.index, speech.index) },
    { kind: "transcript", text: text.slice(speech.index) },
  ];
}
