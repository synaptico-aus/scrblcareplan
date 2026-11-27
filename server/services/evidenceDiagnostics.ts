import { AsyncLocalStorage } from "node:async_hooks";

export const generationDiagnostics = new AsyncLocalStorage<string>();

export type RepairFailure =
  | "unsupported_content" | "invalid_json" | "invalid_structure"
  | "incomplete_response" | "unexpected_or_duplicate_path"
  | "unknown_source_id" | "missing_repair" | "invalid_target"
  | "provider_request_failed" | "post_repair_validation";

export class EvidenceRepairError extends Error {
  constructor(public readonly category: RepairFailure) {
    super(`Evidence repair failed: ${category}`);
    this.name = "EvidenceRepairError";
  }
}

// Only fixed categories, counts and an app-generated correlation ID belong here.
// Never pass provider error messages, model replies, paths or source text.
export function logEvidenceEvent(event: string, details: Record<string, string | number> = {}) {
  console.info(event, { generationId: generationDiagnostics.getStore(), ...details });
}
