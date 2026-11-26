import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Coins, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { TokenUsageResponse, TokenUsageRow } from "@shared/token-usage";

const numberFormat = new Intl.NumberFormat("en-AU");
const dateFormat = new Intl.DateTimeFormat("en-AU", {
  dateStyle: "medium",
  timeStyle: "short",
});
const currencyFormat = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 4,
  maximumFractionDigits: 6,
});

function formatCost(cost: number | null, unreportedCalls: number) {
  return cost === null || unreportedCalls > 0 ? "Unavailable" : currencyFormat.format(cost);
}

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-lg border bg-background/70 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 font-mono text-xl font-semibold tabular-nums text-foreground">{value}</p>
      {detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}
    </div>
  );
}

function UsageTable({ rows }: { rows: TokenUsageRow[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border" role="region" aria-label="Recent AI generations" tabIndex={0}>
      <table className="w-full min-w-[900px] text-left text-sm">
        <caption className="sr-only">Up to 100 most recent AI generation groups and their reported token usage</caption>
        <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">Generation</th>
            <th scope="col" className="px-4 py-3 font-medium">Model</th>
            <th scope="col" className="px-4 py-3 text-right font-medium">Calls</th>
            <th scope="col" className="px-4 py-3 text-right font-medium">Input</th>
            <th scope="col" className="px-4 py-3 text-right font-medium">Cached</th>
            <th scope="col" className="px-4 py-3 text-right font-medium">Output</th>
            <th scope="col" className="px-4 py-3 text-right font-medium">Reasoning</th>
            <th scope="col" className="px-4 py-3 text-right font-medium">Est. cost</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row) => (
            <tr key={row.generationId} className="bg-card transition-colors hover:bg-muted/30">
              <td className="whitespace-nowrap px-4 py-3 text-foreground">
                <time dateTime={row.startedAt}>{dateFormat.format(new Date(row.startedAt))}</time>
                {row.failedCalls > 0 && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    {numberFormat.format(row.failedCalls)} failed
                  </span>
                )}
                {row.unreportedCalls > 0 && (
                  <span className="ml-2 text-xs text-amber-700 dark:text-amber-400">
                    {numberFormat.format(row.unreportedCalls)} unreported
                  </span>
                )}
              </td>
              <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted-foreground">{row.model}</td>
              <td className="px-4 py-3 text-right font-mono tabular-nums">{numberFormat.format(row.calls)}</td>
              <td className="px-4 py-3 text-right font-mono tabular-nums">{numberFormat.format(row.inputTokens)}</td>
              <td className="px-4 py-3 text-right font-mono tabular-nums">{numberFormat.format(row.cachedTokens)}</td>
              <td className="px-4 py-3 text-right font-mono tabular-nums">{numberFormat.format(row.outputTokens)}</td>
              <td className="px-4 py-3 text-right font-mono tabular-nums">{numberFormat.format(row.reasoningTokens)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-right font-mono tabular-nums">
                {formatCost(row.estimatedUsd, row.unreportedCalls)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TokenUsageSettings() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<TokenUsageResponse>({
    queryKey: ["/api/token-usage"],
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-primary" aria-hidden="true" />
              AI token usage
            </CardTitle>
            <CardDescription className="mt-1">
              Your personally scoped usage over the last {data?.days ?? 30} days.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
            disabled={isFetching}
            aria-label={isFetching ? "Refreshing token usage" : "Refresh token usage"}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} aria-hidden="true" />
            {isFetching ? "Refreshing" : "Refresh"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {isLoading ? (
          <div aria-label="Loading token usage" aria-busy="true" className="space-y-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {Array.from({ length: 6 }, (_, index) => (
                <div key={index} className="h-[94px] animate-pulse rounded-lg border bg-muted/60" />
              ))}
            </div>
            <div className="h-44 animate-pulse rounded-lg border bg-muted/60" />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
              <div>
                <p className="font-medium text-foreground">Usage could not be loaded</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {error instanceof Error ? error.message : "Please try again in a moment."}
                </p>
              </div>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}>
              Try again
            </Button>
          </div>
        ) : data ? (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <Metric label="Input tokens" value={numberFormat.format(data.totals.inputTokens)} />
              <Metric label="Output tokens" value={numberFormat.format(data.totals.outputTokens)} />
              <Metric
                label="Reasoning"
                value={numberFormat.format(data.totals.reasoningTokens)}
                detail="Included in output"
              />
              <Metric label="Cached input" value={numberFormat.format(data.totals.cachedTokens)} />
              <Metric label="Generation calls" value={numberFormat.format(data.totals.calls)} />
              <Metric
                label="Estimated cost"
                value={formatCost(data.totals.estimatedUsd, data.totals.unreportedCalls)}
                detail="USD · standard Sol rates"
              />
            </div>

            {(data.totals.unreportedCalls > 0 || data.totals.failedCalls > 0) && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                {data.totals.unreportedCalls > 0 && (
                  <span>
                    {numberFormat.format(data.totals.unreportedCalls)} call
                    {data.totals.unreportedCalls === 1 ? "" : "s"} had incomplete token details; cost is unavailable
                    where usage is incomplete.
                  </span>
                )}
                {data.totals.failedCalls > 0 && (
                  <span>{numberFormat.format(data.totals.failedCalls)} failed API attempts with reported usage are included.</span>
                )}
              </div>
            )}

            <section aria-labelledby="recent-usage-heading" className="space-y-3">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h3 id="recent-usage-heading" className="font-semibold text-foreground">Recent generations</h3>
                  <p className="text-sm text-muted-foreground">Up to 100 most recent groups. Totals above cover the full 30 days.</p>
                </div>
                <Badge variant="secondary">{numberFormat.format(data.recent.length)} shown</Badge>
              </div>
              {data.recent.length > 0 ? (
                <UsageTable rows={data.recent} />
              ) : (
                <div className="flex flex-col items-center rounded-lg border border-dashed bg-muted/20 px-5 py-9 text-center">
                  <Sparkles className="mb-3 h-6 w-6 text-primary" aria-hidden="true" />
                  <p className="font-medium">No token usage recorded yet</p>
                  <p className="mt-1 max-w-md text-sm text-muted-foreground">
                    Tracking begins with your next generation. Earlier generations are not backfilled.
                  </p>
                </div>
              )}
            </section>

            <p className="border-t pt-4 text-xs leading-relaxed text-muted-foreground">
              Costs are estimates at standard Sol USD rates, not provider invoices. Reasoning tokens are part of output
              tokens, not additional billed tokens. Failed API attempts and corrections are included when usage is reported.
              A cost marked unavailable is not zero.
            </p>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
