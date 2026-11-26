import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";
import { pool } from "../db";
import type { User } from "../../shared/schema";
import { tokenCost, type TokenUsageResponse, type TokenUsageRow } from "../../shared/token-usage";

type Scope = { userId: string; organisationId: string; generationId: string };
export const tokenUsageScope = new AsyncLocalStorage<Scope>();
let ready: Promise<unknown> | undefined;
// Additive and idempotent, including when published against the existing RDS DB.
export function ensureTokenUsageTable() {
  return ready ??= pool.query(`CREATE TABLE IF NOT EXISTS ai_token_usage (
    id varchar PRIMARY KEY, user_id varchar NOT NULL, organisation_id varchar NOT NULL,
    generation_id varchar NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
    model text NOT NULL, failed boolean NOT NULL, input_tokens integer, cached_tokens integer,
    output_tokens integer, reasoning_tokens integer, estimated_usd numeric
  )`).then(() => pool.query(`CREATE INDEX IF NOT EXISTS ai_token_usage_owner_date
    ON ai_token_usage (organisation_id,user_id,created_at)`)).catch(error => { ready = undefined; throw error; });
}

export const scopeTokenUsage: RequestHandler = (req, _res, next) => {
  const user = req.user as User | undefined;
  if (!user) return next();
  tokenUsageScope.run({ userId: user.id, organisationId: user.organizationId, generationId: randomUUID() }, next);
};

/** Observe actual non-streaming API responses, including SDK retry attempts.
 * Never retain request text, response text, client identity or credentials.
 */
export function createUsageFetch(
  baseFetch: typeof fetch = fetch,
  persist: (scope: Scope, payload: any, failed: boolean) => Promise<void> = persistUsage,
): typeof fetch {
  return async (input, init) => {
    const scope = tokenUsageScope.getStore();
    let response: Response;
    try { response = await baseFetch(input, init); }
    catch (error) {
      if (scope) {
        try { await persist(scope, {}, true); }
        catch { console.error("AI usage accounting unavailable; a failed request was not recorded."); }
      }
      throw error;
    }
    if (scope) {
      try {
        const payload = await response.clone().json().catch(() => ({}));
        await persist(scope, payload, !response.ok);
      } catch {
        // Do not retry a paid model call because its accounting write failed.
        console.error("AI usage accounting unavailable; this request may not appear in Settings.");
      }
    }
    return response;
  };
}

async function persistUsage(scope: Scope, payload: any, failed: boolean) {
  const usage = payload?.usage;
  const integer = (value: unknown): number | null => typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
  const input = integer(usage?.prompt_tokens);
  const output = integer(usage?.completion_tokens);
  const cached = input === null ? null : Math.min(input, integer(usage?.prompt_tokens_details?.cached_tokens) ?? 0);
  const reasoning = output === null ? null : integer(usage?.completion_tokens_details?.reasoning_tokens);
  const model = typeof payload?.model === "string" && /^[\w.-]{1,120}$/.test(payload.model) ? payload.model : "unreported";
  const cost = input !== null && output !== null ? tokenCost(model, input, cached ?? 0, output) : null;
  await ensureTokenUsageTable();
  await pool.query(`INSERT INTO ai_token_usage
    (id,user_id,organisation_id,generation_id,model,failed,input_tokens,cached_tokens,output_tokens,reasoning_tokens,estimated_usd)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [randomUUID(),scope.userId,scope.organisationId,scope.generationId,model,failed,input,cached,output,reasoning,cost]);
}

export async function getTokenUsage(userId: string, organisationId: string): Promise<TokenUsageResponse> {
  await ensureTokenUsageTable();
  const { rows } = await pool.query(`SELECT generation_id AS "generationId", min(created_at) AS "startedAt",
    string_agg(DISTINCT model, ', ') AS model, count(*)::int AS calls,
    count(*) FILTER (WHERE failed)::int AS "failedCalls",
    count(*) FILTER (WHERE input_tokens IS NULL OR output_tokens IS NULL OR reasoning_tokens IS NULL)::int AS "unreportedCalls",
    coalesce(sum(input_tokens),0)::float8 AS "inputTokens",coalesce(sum(cached_tokens),0)::float8 AS "cachedTokens",
    coalesce(sum(output_tokens),0)::float8 AS "outputTokens",coalesce(sum(reasoning_tokens),0)::float8 AS "reasoningTokens",
    CASE WHEN count(*) FILTER (WHERE estimated_usd IS NULL) > 0 THEN NULL ELSE sum(estimated_usd)::float8 END AS "estimatedUsd"
    FROM ai_token_usage WHERE user_id=$1 AND organisation_id=$2 AND created_at >= now()-interval '30 days'
    GROUP BY generation_id ORDER BY min(created_at) DESC`, [userId, organisationId]);
  const recent = rows as TokenUsageRow[];
  const totals = recent.reduce<TokenUsageResponse["totals"]>((total, row) => ({
    calls: total.calls + row.calls, failedCalls: total.failedCalls + row.failedCalls,
    unreportedCalls: total.unreportedCalls + row.unreportedCalls,
    inputTokens: total.inputTokens + row.inputTokens, cachedTokens: total.cachedTokens + row.cachedTokens,
    outputTokens: total.outputTokens + row.outputTokens, reasoningTokens: total.reasoningTokens + row.reasoningTokens,
    estimatedUsd: total.estimatedUsd === null || row.estimatedUsd === null ? null : total.estimatedUsd + row.estimatedUsd,
  }), { calls:0,failedCalls:0,unreportedCalls:0,inputTokens:0,cachedTokens:0,outputTokens:0,reasoningTokens:0,estimatedUsd:0 });
  return { days:30,totals,recent:recent.slice(0,100) };
}
