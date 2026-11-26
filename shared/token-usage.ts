export type TokenUsageRow = {
  generationId: string;
  startedAt: string;
  model: string;
  calls: number;
  failedCalls: number;
  unreportedCalls: number;
  inputTokens: number;
  cachedTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  estimatedUsd: number | null;
};
export type TokenUsageResponse = {
  days: number;
  totals: Omit<TokenUsageRow, "generationId" | "startedAt" | "model">;
  recent: TokenUsageRow[];
};

/** Standard USD rates; reasoning is already part of output tokens. */
export function tokenCost(model: string, input: number, cached: number, output: number): number | null {
  if (!/^gpt-6\.2-sol(?:-|$)/.test(model)) return null;
  const long = input > 272000;
  return ((input - cached) * (long ? 4 : 2) + cached * (long ? .2 : .1) + output * (long ? 15 : 10)) / 1e6;
}
